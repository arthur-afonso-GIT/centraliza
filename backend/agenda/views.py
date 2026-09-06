from datetime import timedelta
from zoneinfo import ZoneInfo

from django.utils.dateparse import parse_datetime
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.views import APIView

from agenda.models import Compromisso
from agenda.serializers import CompromissoSerializer


def limite_iso(valor, campo):
    parsed = parse_datetime(valor) if valor else None
    if parsed is None or parsed.tzinfo is None or parsed.utcoffset() is None:
        raise exceptions.ValidationError({campo: "Informe data e hora ISO 8601 com offset."})
    return parsed


class CompromissoListView(APIView):
    def get(self, request):
        inicio = limite_iso(request.query_params.get("inicio"), "inicio")
        fim = limite_iso(request.query_params.get("fim"), "fim")
        if fim <= inicio:
            raise exceptions.ValidationError({"fim": "O fim deve ser posterior ao início."})
        if fim - inicio > timedelta(days=42):
            raise exceptions.ValidationError({"fim": "O intervalo máximo é de 42 dias."})
        user = request.user
        if not user.equipe_id:
            raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
        queryset = Compromisso.objects.filter(
            equipe_id=user.equipe_id, inicio__lt=fim, fim__gt=inicio,
        ).prefetch_related("participantes")
        if user.perfil == "inspetor":
            queryset = queryset.filter(participantes=user)
        elif user.perfil != "gestor":
            raise exceptions.PermissionDenied("Perfil sem acesso à agenda.")
        queryset = queryset.order_by("inicio", "fim", "id").distinct()
        zone = ZoneInfo("America/Fortaleza")
        return Response({
            "inicio": inicio.astimezone(zone).isoformat(),
            "fim": fim.astimezone(zone).isoformat(),
            "timezone": "America/Fortaleza",
            "results": CompromissoSerializer(queryset, many=True).data,
        })
