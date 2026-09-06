from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from demandas.models import Demanda, EventoDemanda
from demandas.services import alterar_status_demanda
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
            status__in=[Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO, Demanda.Status.AGUARDANDO_AVALIACAO, Demanda.Status.EM_CORRECAO],
        ).select_related("responsavel")

        status = self.request.query_params.get("status")
        if status is not None:
            if status not in [Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO, Demanda.Status.AGUARDANDO_AVALIACAO, Demanda.Status.EM_CORRECAO]:
                raise exceptions.ValidationError({"status": "Informe um status ativo válido."})
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
    def patch(self, request, pk):
        serializer = AlterarStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            demanda = alterar_status_demanda(
                demanda_id=pk, usuario=request.user,
                novo_status=serializer.validated_data["status"],
                texto=serializer.validated_data.get("texto", ""),
            )
        except Demanda.DoesNotExist:
            raise exceptions.NotFound() from None
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
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
