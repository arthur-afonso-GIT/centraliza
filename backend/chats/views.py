from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from chats.models import Conversa, MensagemConversa
from chats.serializers import (
    ConversaSerializer, CriarConversaSerializer, CriarMensagemSerializer,
    MembroChatSerializer, MensagemSerializer, membros_ativos,
)
from usuarios.models import VinculoEquipe


def conversas_permitidas(user):
    if not user.is_active or not user.equipe_id or user.perfil not in {"gestor", "inspetor"}:
        raise exceptions.PermissionDenied("Sua conta não possui acesso às conversas desta equipe.")
    if user.vinculos_equipe.exists() and not VinculoEquipe.objects.filter(
        usuario=user, equipe_id=user.equipe_id, ativo=True,
    ).exists():
        raise exceptions.PermissionDenied("Seu vínculo com esta equipe não está ativo.")
    return Conversa.objects.filter(equipe_id=user.equipe_id, participantes=user)


def conversa_completa(queryset):
    return queryset.prefetch_related("participantes", "mensagens__autor")


class MembrosChatView(APIView):
    def get(self, request):
        conversas_permitidas(request.user)
        membros = membros_ativos(request.user.equipe_id).exclude(pk=request.user.id).order_by("first_name", "last_name", "username", "id")
        return Response({"resultados": MembroChatSerializer(membros, many=True).data})


class ConversaListView(APIView):
    def get(self, request):
        conversas = conversa_completa(conversas_permitidas(request.user)).order_by("-atualizada_em", "-id")
        return Response({"resultados": ConversaSerializer(conversas, many=True).data})

    @transaction.atomic
    def post(self, request):
        conversas_permitidas(request.user)
        serializer = CriarConversaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        conversa = Conversa.objects.create(
            titulo=serializer.validated_data["titulo"], equipe_id=request.user.equipe_id, criador=request.user,
        )
        conversa.participantes.set([request.user.id, *serializer.validated_data["participante_ids"]])
        return Response(ConversaSerializer(conversa_completa(Conversa.objects).get(pk=conversa.pk)).data, status=status.HTTP_201_CREATED)


class ConversaDetailView(APIView):
    def get(self, request, pk):
        conversa = get_object_or_404(conversa_completa(conversas_permitidas(request.user)), pk=pk)
        return Response(ConversaSerializer(conversa).data)


class MensagemListView(APIView):
    @transaction.atomic
    def post(self, request, pk):
        conversa = get_object_or_404(conversas_permitidas(request.user).select_for_update(of=("self",)), pk=pk)
        serializer = CriarMensagemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mensagem = MensagemConversa.objects.create(
            conversa=conversa, autor=request.user, texto=serializer.validated_data["texto"],
        )
        Conversa.objects.filter(pk=conversa.pk).update(atualizada_em=timezone.now())
        return Response(MensagemSerializer(mensagem).data, status=status.HTTP_201_CREATED)
