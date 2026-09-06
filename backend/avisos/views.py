from django.db.models import Case, IntegerField, Value, When
from rest_framework import exceptions
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from avisos.models import Aviso
from avisos.serializers import AvisoDetalheSerializer, AvisoFeedSerializer


def avisos_da_equipe(user):
    if not user.equipe_id:
        raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
    if user.perfil not in {"gestor", "inspetor"}:
        raise exceptions.PermissionDenied("Perfil sem acesso aos avisos.")
    return Aviso.objects.filter(equipe_id=user.equipe_id).select_related("autor")


class AvisoListView(APIView):
    def get(self, request):
        prioridade = Case(
            When(categoria=Aviso.Categoria.URGENTE, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        )
        queryset = avisos_da_equipe(request.user).alias(prioridade_categoria=prioridade).order_by(
            "prioridade_categoria", "-publicado_em", "-id"
        )
        return Response({"resultados": AvisoFeedSerializer(queryset, many=True).data})


class AvisoDetailView(RetrieveAPIView):
    serializer_class = AvisoDetalheSerializer

    def get_queryset(self):
        return avisos_da_equipe(self.request.user)
