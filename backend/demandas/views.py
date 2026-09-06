from django.db.models import QuerySet
from rest_framework import exceptions, generics
from rest_framework.pagination import PageNumberPagination

from demandas.models import Demanda
from demandas.serializers import DemandaSerializer


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
        if not user.equipe_id:
            raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
        queryset = Demanda.objects.filter(
            equipe_id=user.equipe_id,
            status__in=[Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO],
        ).select_related("responsavel")
        if user.perfil == "inspetor":
            queryset = queryset.filter(responsavel=user)
        elif user.perfil != "gestor":
            raise exceptions.PermissionDenied("Perfil sem acesso à listagem.")

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
