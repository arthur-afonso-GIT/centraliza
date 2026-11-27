from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from chats.models import Conversa, MensagemConversa
from chats.pesquisa import parametros, filtrar_conversas, filtrar_mensagens, paginar
from chats.serializers import (
    CriarConversaSerializer, CriarMensagemSerializer,
    MembroChatSerializer, MensagemSerializer, ResumoConversaSerializer, membros_ativos,
)
from usuarios.models import VinculoEquipe


def conversas_permitidas(user):
    if not user.is_active or not user.equipe_id or user.perfil not in {"gestor", "inspetor"}:
        raise exceptions.PermissionDenied("Sua conta não possui acesso às conversas desta equipe.")
    if user.vinculos_equipe.exists() and not VinculoEquipe.objects.filter(
        usuario=user, equipe_id=user.equipe_id, ativo=True,
    ).exists():
        raise exceptions.PermissionDenied("Seu vínculo com esta equipe não está ativo.")
    # O par conversa/participante é único na tabela intermediária. Este filtro
    # não duplica conversas; DISTINCT impediria SELECT FOR UPDATE no PostgreSQL.
    return Conversa.objects.filter(equipe_id=user.equipe_id, participantes=user)


def conversa_completa(queryset):
    return queryset.prefetch_related("participantes").annotate(ultima_mensagem=Subquery(
        MensagemConversa.objects.filter(conversa_id=OuterRef("pk")).order_by("-criada_em", "-id").values("texto")[:1]))


def pagina_mensagens(request, conversa, p):
    qs = filtrar_mensagens(conversa.mensagens.select_related("autor"), p)
    if "apos" in p:
        qs = qs.filter(id__gt=p["apos"])
    rows, cursor = paginar(qs, request, p, f"mensagens:{conversa.pk}", asc="apos" in p)
    if "apos" not in p:
        rows.reverse()
    return {"resultados": MensagemSerializer(rows, many=True).data, "proximo_cursor": cursor}


class MembrosChatView(APIView):
    def get(self, request):
        conversas_permitidas(request.user)
        membros = membros_ativos(request.user.equipe_id).exclude(pk=request.user.id).order_by("first_name", "last_name", "username", "id")
        return Response({"resultados": MembroChatSerializer(membros, many=True).data})


class ConversaListView(APIView):
    def get(self, request):
        permitidas = conversas_permitidas(request.user)
        p = parametros(request)
        conversas = conversa_completa(filtrar_conversas(permitidas, p))
        rows, cursor = paginar(conversas, request, p, "conversas")
        return Response({"resultados": ResumoConversaSerializer(rows, many=True).data, "proximo_cursor": cursor})

    @transaction.atomic
    def post(self, request):
        conversas_permitidas(request.user)
        serializer = CriarConversaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        conversa = Conversa.objects.create(
            titulo=serializer.validated_data["titulo"], equipe_id=request.user.equipe_id, criador=request.user,
        )
        conversa.participantes.set([request.user.id, *serializer.validated_data["participante_ids"]])
        data = ResumoConversaSerializer(conversa_completa(Conversa.objects).get(pk=conversa.pk)).data
        return Response({**data, "mensagens": [], "proximo_cursor": None}, status=status.HTTP_201_CREATED)


class ConversaDetailView(APIView):
    def get(self, request, pk):
        conversa = get_object_or_404(conversa_completa(conversas_permitidas(request.user)), pk=pk)
        page = pagina_mensagens(request, conversa, parametros(request))
        return Response({**ResumoConversaSerializer(conversa).data, "mensagens": page["resultados"], "proximo_cursor": page["proximo_cursor"]})


class MensagemListView(APIView):
    def get(self, request, pk):
        conversa = get_object_or_404(conversas_permitidas(request.user), pk=pk)
        return Response(pagina_mensagens(request, conversa, parametros(request)))

    @transaction.atomic
    def post(self, request, pk):
        conversa = get_object_or_404(conversas_permitidas(request.user).select_for_update(of=("self",)), pk=pk)
        serializer = CriarMensagemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client_id = serializer.validated_data.get("client_id")
        if client_id:
            existente = MensagemConversa.objects.filter(
                conversa=conversa, autor=request.user, client_id=client_id,
            ).first()
            if existente:
                if existente.texto != serializer.validated_data["texto"]:
                    return Response({"detail": "Identificador já utilizado para outra mensagem."}, status=status.HTTP_409_CONFLICT)
                return Response(MensagemSerializer(existente).data)
        mensagem = MensagemConversa.objects.create(
            conversa=conversa, autor=request.user, texto=serializer.validated_data["texto"], client_id=client_id,
        )
        Conversa.objects.filter(pk=conversa.pk).update(atualizada_em=timezone.now())
        return Response(MensagemSerializer(mensagem).data, status=status.HTTP_201_CREATED)
