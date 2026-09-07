from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Case, IntegerField, Q, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from avisos.models import Aviso
from avisos.serializers import AvisoDetalheSerializer, AvisoFeedSerializer, GerenciarAvisoSerializer


def avisos_da_equipe(user):
    if not user.equipe_id:
        raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
    if user.perfil not in {"gestor", "inspetor"}:
        raise exceptions.PermissionDenied("Perfil sem acesso aos avisos.")
    return Aviso.objects.filter(equipe_id=user.equipe_id).select_related("autor")


def exigir_gestor(user):
    if user.perfil != "gestor" or not user.equipe_id:
        raise exceptions.PermissionDenied("Somente gestores podem gerenciar avisos.")


def salvar_aviso(*, user, dados, aviso=None):
    exigir_gestor(user)
    destinatarios = dados.pop("destinatarios", None)
    with transaction.atomic():
        if aviso is None:
            aviso = Aviso(equipe_id=user.equipe_id, autor=user)
        if aviso.cancelado_em:
            raise exceptions.ValidationError({"detail": "Um aviso cancelado não pode ser editado."})
        for campo, valor in dados.items():
            setattr(aviso, campo, valor)
        try:
            aviso.save()
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        if destinatarios is not None:
            aviso.destinatarios.set(destinatarios)
    return aviso


class AvisoListView(APIView):
    def post(self, request):
        serializer = GerenciarAvisoSerializer(data=request.data, context={"request": request})
        for campo in ("titulo", "resumo", "conteudo", "categoria", "publicado_em"):
            serializer.fields[campo].required = True
        serializer.is_valid(raise_exception=True)
        aviso = salvar_aviso(user=request.user, dados=dict(serializer.validated_data))
        return Response(AvisoDetalheSerializer(aviso).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        prioridade = Case(
            When(categoria=Aviso.Categoria.URGENTE, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        )
        queryset = avisos_da_equipe(request.user).filter(cancelado_em__isnull=True)
        if request.user.perfil == "inspetor":
            agora = timezone.now()
            queryset = queryset.filter(publicado_em__lte=agora).filter(Q(expira_em__isnull=True) | Q(expira_em__gt=agora)).filter(Q(destinatarios=request.user) | Q(destinatarios__isnull=True))
        queryset = queryset.prefetch_related("destinatarios").alias(prioridade_categoria=prioridade).order_by(
            "prioridade_categoria", "-publicado_em", "-id"
        ).distinct()
        return Response({"resultados": AvisoFeedSerializer(queryset, many=True).data})


class AvisoDetailView(RetrieveAPIView):
    serializer_class = AvisoDetalheSerializer

    def get_queryset(self):
        queryset = avisos_da_equipe(self.request.user).filter(cancelado_em__isnull=True).prefetch_related("destinatarios")
        if self.request.user.perfil == "inspetor":
            agora = timezone.now()
            queryset = queryset.filter(publicado_em__lte=agora).filter(Q(expira_em__isnull=True) | Q(expira_em__gt=agora)).filter(Q(destinatarios=self.request.user) | Q(destinatarios__isnull=True))
        return queryset.distinct()

    def patch(self, request, pk):
        exigir_gestor(request.user)
        aviso = get_object_or_404(avisos_da_equipe(request.user).prefetch_related("destinatarios"), pk=pk)
        serializer = GerenciarAvisoSerializer(data=request.data, partial=True, context={"request": request, "instance": aviso})
        serializer.is_valid(raise_exception=True)
        aviso = salvar_aviso(user=request.user, dados=dict(serializer.validated_data), aviso=aviso)
        return Response(AvisoDetalheSerializer(aviso).data)

    def delete(self, request, pk):
        exigir_gestor(request.user)
        aviso = get_object_or_404(avisos_da_equipe(request.user), pk=pk, cancelado_em__isnull=True)
        aviso.cancelado_em = timezone.now()
        aviso.cancelado_por = request.user
        aviso.save(update_fields=["cancelado_em", "cancelado_por", "atualizado_em"])
        return Response(status=status.HTTP_204_NO_CONTENT)
