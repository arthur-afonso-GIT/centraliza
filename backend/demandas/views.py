from django.db import transaction
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from demandas.models import Demanda, EventoDemanda
from demandas.serializers import (
    AlterarStatusSerializer, CriarComentarioSerializer, DemandaDetalheSerializer,
    DemandaSerializer, EventoDemandaSerializer,
)


def demandas_permitidas(user):
    if not user.equipe_id:
        raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
    queryset = Demanda.objects.filter(equipe_id=user.equipe_id)
    if user.perfil == "inspetor":
        return queryset.filter(responsavel=user)
    if user.perfil == "gestor":
        return queryset
    raise exceptions.PermissionDenied("Perfil sem acesso às demandas.")


class DemandasPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_page_number(self, request, paginator):
        raw = request.query_params.get(self.page_query_param, 1)
        try:
            value = int(raw)
        except (TypeError, ValueError) as exc:
            raise exceptions.ValidationError({"page": "Informe um inteiro positivo."}) from exc
        if value < 1:
            raise exceptions.ValidationError({"page": "Informe um inteiro positivo."})
        return value

    def get_page_size(self, request):
        raw = request.query_params.get(self.page_size_query_param)
        if raw is None:
            return self.page_size
        try:
            value = int(raw)
        except ValueError as exc:
            raise exceptions.ValidationError({"page_size": "Informe um inteiro entre 1 e 50."}) from exc
        if not 1 <= value <= self.max_page_size:
            raise exceptions.ValidationError({"page_size": "Informe um inteiro entre 1 e 50."})
        return value


class DemandaListView(generics.ListAPIView):
    serializer_class = DemandaSerializer
    pagination_class = DemandasPagination
    http_method_names = ["get", "head", "options"]

    def get_queryset(self) -> QuerySet[Demanda]:
        user = self.request.user
        queryset = demandas_permitidas(user).filter(
            status__in=[Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO],
        ).select_related("responsavel")

        status = self.request.query_params.get("status")
        if status is not None:
            if status not in [Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO]:
                raise exceptions.ValidationError({"status": "Use pendente ou em_andamento."})
            queryset = queryset.filter(status=status)

        critica = self.request.query_params.get("critica")
        if critica is not None:
            if critica not in ["true", "false"]:
                raise exceptions.ValidationError({"critica": "Use true ou false."})
            queryset = queryset.filter(critica=critica == "true")
        return queryset.order_by("prazo", "id")


class DemandaDetailView(generics.RetrieveAPIView):
    serializer_class = DemandaDetalheSerializer

    def get_queryset(self):
        return demandas_permitidas(self.request.user).select_related("responsavel").prefetch_related("historico__autor")


class DemandaStatusView(APIView):
    @transaction.atomic
    def patch(self, request, pk):
        if request.user.perfil != "inspetor":
            raise exceptions.PermissionDenied("Somente o inspetor responsável pode alterar o status.")
        demanda = get_object_or_404(demandas_permitidas(request.user).select_for_update(), pk=pk)
        serializer = AlterarStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        novo_status = serializer.validated_data["status"]
        permitida = {
            Demanda.Status.PENDENTE: Demanda.Status.EM_ANDAMENTO,
            Demanda.Status.EM_ANDAMENTO: Demanda.Status.CONCLUIDA,
        }.get(demanda.status)
        if novo_status != permitida:
            raise exceptions.ValidationError({"status": "Transição de status não permitida."})
        anterior = demanda.status
        demanda.status = novo_status
        demanda.save(update_fields=["status", "atualizada_em"])
        EventoDemanda.objects.create(
            demanda=demanda, tipo=EventoDemanda.Tipo.STATUS_ALTERADO, autor=request.user,
            status_anterior=anterior, status_novo=novo_status,
        )
        demanda = demandas_permitidas(request.user).select_related("responsavel").prefetch_related("historico__autor").get(pk=pk)
        return Response(DemandaDetalheSerializer(demanda).data)


class DemandaComentarioView(APIView):
    def post(self, request, pk):
        demanda = get_object_or_404(demandas_permitidas(request.user), pk=pk)
        serializer = CriarComentarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evento = EventoDemanda.objects.create(
            demanda=demanda, tipo=EventoDemanda.Tipo.COMENTARIO,
            autor=request.user, texto=serializer.validated_data["texto"],
        )
        return Response(EventoDemandaSerializer(evento).data, status=status.HTTP_201_CREATED)
