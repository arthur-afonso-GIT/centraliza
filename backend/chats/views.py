from django.db import transaction
from django.db.models import F, OuterRef, Prefetch, Subquery, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from chats.models import Conversa, LeituraConversa, MensagemConversa
from chats.serializers import (
    ConversaSerializer, CriarConversaSerializer, CriarMensagemSerializer,
    MarcarLeituraSerializer, MembroChatSerializer, MensagemSerializer, membros_ativos,
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


def conversa_completa(queryset, user):
    return queryset.prefetch_related(
        "participantes", "mensagens__autor",
        Prefetch("leituras", queryset=LeituraConversa.objects.filter(usuario=user), to_attr="leituras_usuario"),
    )


def conversa_para_escrita(user, pk):
    # PostgreSQL não permite FOR UPDATE com DISTINCT na mesma consulta.
    permitidas = conversas_permitidas(user).values("pk")
    return get_object_or_404(Conversa.objects.filter(pk__in=permitidas).select_for_update(), pk=pk)


class MembrosChatView(APIView):
    def get(self, request):
        conversas_permitidas(request.user)
        membros = membros_ativos(request.user.equipe_id).exclude(pk=request.user.id).order_by("first_name", "last_name", "username", "id")
        return Response({"resultados": MembroChatSerializer(membros, many=True).data})


class ConversaListView(APIView):
    def get(self, request):
        conversas = conversa_completa(conversas_permitidas(request.user), request.user).order_by("-atualizada_em", "-id")
        return Response({"resultados": ConversaSerializer(conversas, many=True, context={"request": request}).data})

    @transaction.atomic
    def post(self, request):
        conversas_permitidas(request.user)
        serializer = CriarConversaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        conversa = Conversa.objects.create(
            titulo=serializer.validated_data["titulo"], equipe_id=request.user.equipe_id, criador=request.user,
        )
        conversa.participantes.set([request.user.id, *serializer.validated_data["participante_ids"]])
        return Response(ConversaSerializer(conversa_completa(Conversa.objects, request.user).get(pk=conversa.pk), context={"request": request}).data, status=status.HTTP_201_CREATED)


class ConversaDetailView(APIView):
    def get(self, request, pk):
        conversa = get_object_or_404(conversa_completa(conversas_permitidas(request.user), request.user), pk=pk)
        return Response(ConversaSerializer(conversa, context={"request": request}).data)


class MensagemListView(APIView):
    @transaction.atomic
    def post(self, request, pk):
        conversa = conversa_para_escrita(request.user, pk)
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


class ConversaLeituraView(APIView):
    @transaction.atomic
    def post(self, request, pk):
        conversa = conversa_para_escrita(request.user, pk)
        serializer = MarcarLeituraSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mensagem_id = serializer.validated_data["mensagem_id"]
        if not conversa.mensagens.filter(pk=mensagem_id).exists():
            raise exceptions.ValidationError({"mensagem_id": "A mensagem não pertence a esta conversa."})
        leitura, _ = LeituraConversa.objects.get_or_create(conversa=conversa, usuario=request.user)
        if mensagem_id > leitura.ultima_mensagem_lida_id:
            leitura.ultima_mensagem_lida_id = mensagem_id
            leitura.save(update_fields=["ultima_mensagem_lida_id"])
        return Response({"ultima_mensagem_lida_id": leitura.ultima_mensagem_lida_id})


class NotificacoesChatView(APIView):
    """Resumo das mensagens não lidas para avisos fora da tela de Chats."""

    def get(self, request):
        user = request.user
        cursor = Coalesce(Subquery(
            LeituraConversa.objects.filter(conversa=OuterRef("conversa"), usuario=user).values("ultima_mensagem_lida_id")[:1]
        ), Value(0))
        # Mesma regra das não lidas do CHAT-03: depois do cursor e de outra pessoa.
        novas = (
            MensagemConversa.objects.filter(conversa__in=conversas_permitidas(user).values("pk"))
            .exclude(autor=user).annotate(cursor=cursor).filter(id__gt=F("cursor"))
            .order_by().values_list("conversa_id", "id")
        )
        por_conversa = {}
        for conversa_id, mensagem_id in novas:
            total, ultima = por_conversa.get(conversa_id, (0, 0))
            por_conversa[conversa_id] = (total + 1, max(ultima, mensagem_id))
        ultimas = MensagemConversa.objects.select_related("autor", "conversa").in_bulk(
            [ultima for _, ultima in por_conversa.values()]
        )
        conversas = sorted((
            {
                "id": conversa_id, "titulo": ultimas[ultima].conversa.titulo, "nao_lidas": total,
                # Sem o texto: o aviso pode aparecer em telas compartilhadas.
                "ultima_mensagem": {
                    "id": ultima, "autor_nome": ultimas[ultima].autor.nome, "criada_em": ultimas[ultima].criada_em,
                },
            }
            for conversa_id, (total, ultima) in por_conversa.items()
        ), key=lambda item: item["ultima_mensagem"]["id"], reverse=True)
        return Response({"total": sum(item["nao_lidas"] for item in conversas), "conversas": conversas})
