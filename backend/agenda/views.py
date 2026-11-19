from datetime import timedelta
from zoneinfo import ZoneInfo

from django.utils.dateparse import parse_datetime
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from agenda.models import Compromisso
from agenda.serializers import CompromissoSerializer, GerenciarCompromissoSerializer, ReuniaoInspetorSerializer
from agenda.services import ConflitoAgenda, cancelar_compromisso, criar_reuniao_inspetor, salvar_compromisso
from usuarios.models import Usuario


def limite_iso(valor, campo):
    parsed = parse_datetime(valor) if valor else None
    if parsed is None or parsed.tzinfo is None or parsed.utcoffset() is None:
        raise exceptions.ValidationError({campo: "Informe data e hora ISO 8601 com offset."})
    return parsed


class CompromissoListView(APIView):
    def post(self, request):
        if request.user.perfil == "inspetor":
            # O inspetor agenda somente reuniões das quais participa.
            serializer = ReuniaoInspetorSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            salvar = lambda: criar_reuniao_inspetor(usuario=request.user, dados=serializer.validated_data)
        else:
            serializer = GerenciarCompromissoSerializer(data=request.data, context={"request": request})
            for campo in ("titulo", "tipo", "inicio", "fim", "participante_ids"):
                serializer.fields[campo].required = True
            serializer.is_valid(raise_exception=True)
            salvar = lambda: salvar_compromisso(usuario=request.user, dados=serializer.validated_data)
        try:
            compromisso = salvar()
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        except ConflitoAgenda as exc:
            visiveis = [
                item for item in exc.compromissos
                if item.equipe_id == request.user.equipe_id and (
                    request.user.perfil == "gestor" or item.participantes.filter(pk=request.user.pk).exists()
                )
            ]
            return Response({"detail": "Há conflito de horário para um ou mais participantes.", "conflitos": CompromissoSerializer(visiveis, many=True).data}, status=status.HTTP_409_CONFLICT)
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


class ParticipantesReuniaoView(APIView):
    def get(self, request):
        if not request.user.equipe_id:
            raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
        integrantes = Usuario.objects.filter(
            vinculos_equipe__equipe_id=request.user.equipe_id,
            vinculos_equipe__ativo=True,
            is_active=True,
        ).exclude(pk=request.user.pk).distinct().order_by("first_name", "last_name", "username", "id")
        return Response({"resultados": [{"id": item.id, "nome": item.nome} for item in integrantes]})


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
