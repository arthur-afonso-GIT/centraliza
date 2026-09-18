from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Count, Q
from usuarios.models import Equipe, Usuario, VinculoEquipe
from usuarios.serializers import AtualizarEquipeSerializer, AtualizarMembroEquipeSerializer, CriarEquipeSerializer, CriarMembroEquipeSerializer, EquipeSerializer, MembroEquipeSerializer, VinculoEquipeSerializer


def dados_sessao(user):
    return {"id": user.id, "nome": user.nome, "perfil": user.perfil, "pode_administrar_equipe": user.pode_administrar_equipe}


def erro_serializer(serializer):
    primeiro = next(iter(serializer.errors.values()))
    if isinstance(primeiro, (list, tuple)):
        primeiro = primeiro[0]
    return Response({"detail": str(primeiro)}, status=status.HTTP_400_BAD_REQUEST)


class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Credenciais inválidas."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response(dados_sessao(user))


class MeView(APIView):
    def get(self, request):
        user = request.user
        return Response(dados_sessao(user))


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InspetorListView(APIView):
    def get(self, request):
        user = request.user
        if user.perfil != "gestor" or not user.equipe_id:
            return Response({"detail": "Somente gestores podem consultar inspetores."}, status=status.HTTP_403_FORBIDDEN)
        inspetores = Usuario.objects.filter(
            equipe_id=user.equipe_id, perfil="inspetor", is_active=True,
        ).order_by("first_name", "last_name", "username", "id")
        return Response({"resultados": [{"id": item.id, "nome": item.nome} for item in inspetores]})


class VinculosEquipeView(APIView):
    def get(self, request):
        vinculos = request.user.vinculos_equipe.filter(ativo=True).select_related("equipe")
        return Response({"resultados": VinculoEquipeSerializer(vinculos, many=True).data})

    def post(self, request):
        if request.user.perfil != Usuario.Perfil.GESTOR or not request.user.is_active:
            return Response({"detail": "Somente gestores ativos podem criar equipes."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CriarEquipeSerializer(data=request.data)
        if not serializer.is_valid():
            return erro_serializer(serializer)
        equipe = serializer.save(criada_por=request.user)
        VinculoEquipe.objects.create(usuario=request.user, equipe=equipe, papel=VinculoEquipe.Papel.GESTOR, pode_administrar=True)
        return Response(EquipeSerializer(equipe).data, status=status.HTTP_201_CREATED)


class EquipesAcessiveisView(APIView):
    def get(self, request):
        equipes = Equipe.objects.filter(vinculos__usuario=request.user, vinculos__ativo=True).annotate(
            integrantes_ativos=Count("vinculos__usuario", filter=Q(vinculos__ativo=True), distinct=True),
            demandas_ativas=Count("demanda", filter=Q(demanda__status__in=["pendente", "em_andamento", "aguardando_avaliacao", "em_correcao"]), distinct=True),
        ).order_by("arquivada", "nome").distinct()
        dados = EquipeSerializer(equipes, many=True).data
        administraveis = set(request.user.vinculos_equipe.filter(ativo=True, papel=VinculoEquipe.Papel.GESTOR, pode_administrar=True).values_list("equipe_id", flat=True))
        for item in dados:
            item["pode_administrar"] = item["id"] in administraveis
        return Response({"resultados": dados})


class EquipeDetailAdminView(APIView):
    def patch(self, request, pk):
        try:
            vinculo = request.user.vinculos_equipe.get(equipe_id=pk, ativo=True, papel=Usuario.Perfil.GESTOR, pode_administrar=True)
        except VinculoEquipe.DoesNotExist:
            if request.user.equipe_id != pk or request.user.perfil != Usuario.Perfil.GESTOR or not request.user.pode_administrar_equipe:
                return Response({"detail": "Você não administra esta equipe."}, status=status.HTTP_403_FORBIDDEN)
            equipe = Equipe.objects.get(pk=pk)
        else:
            equipe = vinculo.equipe
        serializer = AtualizarEquipeSerializer(equipe, data=request.data, partial=True)
        if not serializer.is_valid():
            return erro_serializer(serializer)
        serializer.save()
        return Response(EquipeSerializer(equipe).data)


class SelecionarEquipeView(APIView):
    def post(self, request):
        try:
            equipe_id = int(request.data.get("equipe_id"))
        except (TypeError, ValueError):
            return Response({"detail": "Informe uma equipe válida."}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.vinculos_equipe.filter(equipe_id=equipe_id, ativo=True).exists():
            return Response({"detail": "Você não possui vínculo ativo com esta equipe."}, status=status.HTTP_403_FORBIDDEN)
        request.session["equipe_ativa_id"] = equipe_id
        request.session.modified = True
        return Response({"equipe_id": equipe_id})


class EquipeDetailView(APIView):
    def get(self, request):
        if not request.user.equipe_id:
            return Response({"detail": "Sua conta não está vinculada a uma equipe."}, status=status.HTTP_403_FORBIDDEN)
        membros = Usuario.objects.filter(equipe_id=request.user.equipe_id).order_by("-is_active", "first_name", "last_name", "username", "id")
        return Response({
            "id": request.user.equipe_id,
            "nome": request.user.equipe.nome,
            "pode_administrar": request.user.pode_administrar_equipe,
            "membros": MembroEquipeSerializer(membros, many=True).data,
        })


class MembroEquipeListView(APIView):
    def post(self, request):
        if not request.user.pode_administrar_equipe or not request.user.equipe_id:
            return Response({"detail": "Você não tem permissão para administrar esta equipe."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CriarMembroEquipeSerializer(data=request.data, context={"equipe": request.user.equipe})
        if not serializer.is_valid():
            return erro_serializer(serializer)
        usuario = serializer.save()
        return Response(MembroEquipeSerializer(usuario).data, status=status.HTTP_201_CREATED)


class MembroEquipeDetailView(APIView):
    def patch(self, request, pk):
        if not request.user.pode_administrar_equipe or not request.user.equipe_id:
            return Response({"detail": "Você não tem permissão para administrar esta equipe."}, status=status.HTTP_403_FORBIDDEN)
        try:
            usuario = Usuario.objects.get(pk=pk, equipe_id=request.user.equipe_id)
        except Usuario.DoesNotExist:
            return Response({"detail": "Integrante não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AtualizarMembroEquipeSerializer(usuario, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return erro_serializer(serializer)
        serializer.save()
        return Response(MembroEquipeSerializer(usuario).data)
