from datetime import timedelta
from zoneinfo import ZoneInfo

from django.utils.dateparse import parse_datetime
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from agenda.models import Compromisso
from agenda.serializers import CompromissoSerializer, GerenciarCompromissoSerializer
from agenda.services import ConflitoAgenda, cancelar_compromisso, salvar_compromisso


def limite_iso(valor, campo):
    parsed = parse_datetime(valor) if valor else None
    if parsed is None or parsed.tzinfo is None or parsed.utcoffset() is None:
        raise exceptions.ValidationError({campo: "Informe data e hora ISO 8601 com offset."})
    return parsed


class CompromissoListView(APIView):
    def post(self, request):
        serializer = GerenciarCompromissoSerializer(data=request.data, context={"request": request})
        for campo in ("titulo", "tipo", "inicio", "fim", "participante_ids"):
            serializer.fields[campo].required = True
        serializer.is_valid(raise_exception=True)
        try:
            compromisso = salvar_compromisso(usuario=request.user, dados=serializer.validated_data)
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        except ConflitoAgenda as exc:
            return Response({"detail": "Há conflito de horário para um ou mais participantes.", "conflitos": CompromissoSerializer(exc.compromissos, many=True).data}, status=status.HTTP_409_CONFLICT)
        return Response(CompromissoSerializer(compromisso).data, status=status.HTTP_201_CREATED)

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
            equipe_id=user.equipe_id, cancelado_em__isnull=True, inicio__lt=fim, fim__gt=inicio,
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


class CompromissoDetailView(APIView):
    def get_object(self, request, pk):
        if not request.user.equipe_id:
            raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
        return get_object_or_404(Compromisso.objects.prefetch_related("participantes"), pk=pk, equipe_id=request.user.equipe_id)

    def patch(self, request, pk):
        compromisso = self.get_object(request, pk)
        serializer = GerenciarCompromissoSerializer(data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            compromisso = salvar_compromisso(usuario=request.user, dados=serializer.validated_data, compromisso=compromisso)
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        except ConflitoAgenda as exc:
            return Response({"detail": "Há conflito de horário para um ou mais participantes.", "conflitos": CompromissoSerializer(exc.compromissos, many=True).data}, status=status.HTTP_409_CONFLICT)
        return Response(CompromissoSerializer(compromisso).data)

    def delete(self, request, pk):
        compromisso = self.get_object(request, pk)
        try:
            cancelar_compromisso(compromisso=compromisso, usuario=request.user)
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)
