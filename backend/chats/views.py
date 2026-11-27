from django.db import transaction
from django.db.models import Count, F, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from chats.models import Conversa, LeituraConversa, MensagemConversa
from chats.pesquisa import parametros, filtrar_conversas, filtrar_mensagens, paginar
from chats.serializers import (
    CriarConversaSerializer, CriarMensagemSerializer, MarcarLeituraSerializer,
    MembroChatSerializer, MensagemSerializer, ResumoConversaSerializer, membros_ativos,
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
    leitura = LeituraConversa.objects.filter(conversa_id=OuterRef("pk"), usuario=user)
    cursor = Coalesce(Subquery(leitura.values("ultima_mensagem_lida_id")[:1]), Value(0))
    novas = (MensagemConversa.objects.filter(conversa_id=OuterRef("pk"), id__gt=OuterRef("ultima_mensagem_lida_id"))
             .exclude(autor=user).order_by().values("conversa_id").annotate(total=Count("pk")).values("total"))
    return queryset.prefetch_related("participantes").annotate(
        ultima_mensagem_lida_id=cursor,
    ).annotate(
        nao_lidas=Coalesce(Subquery(novas), Value(0)),
        ultima_mensagem=Subquery(MensagemConversa.objects.filter(conversa_id=OuterRef("pk"))
                                .order_by("-criada_em", "-id").values("texto")[:1]),
    )


def conversa_para_escrita(user, pk):
    permitidas = conversas_permitidas(user).values("pk")
    return get_object_or_404(Conversa.objects.filter(pk__in=permitidas).select_for_update(), pk=pk)


def pagina_mensagens(request, conversa, p):
    qs = filtrar_mensagens(conversa.mensagens.select_related("autor"), p)
    if "apos" in p:
        qs = qs.filter(id__gt=p["apos"])
    rows, cursor = paginar(qs, request, p, f"mensagens:{conversa.pk}", asc="apos" in p)
    if "apos" not in p:
        rows.reverse()
    return {"resultados": MensagemSerializer(rows, many=True).data, "proximo_cursor": cursor}


class MembrosChatView(APIView):
    def get(self, request):
        conversas_permitidas(request.user)
        membros = membros_ativos(request.user.equipe_id).exclude(pk=request.user.id).order_by("first_name", "last_name", "username", "id")
        return Response({"resultados": MembroChatSerializer(membros, many=True).data})


class ConversaListView(APIView):
    def get(self, request):
        permitidas = conversas_permitidas(request.user)
        p = parametros(request)
        conversas = conversa_completa(filtrar_conversas(permitidas, p), request.user)
        rows, cursor = paginar(conversas, request, p, "conversas")
        return Response({"resultados": ResumoConversaSerializer(rows, many=True).data, "proximo_cursor": cursor})

    @transaction.atomic
    def post(self, request):
        conversas_permitidas(request.user)
        serializer = CriarConversaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        conversa = Conversa.objects.create(
            titulo=serializer.validated_data["titulo"], equipe_id=request.user.equipe_id, criador=request.user,
        )
        conversa.participantes.set([request.user.id, *serializer.validated_data["participante_ids"]])
        data = ResumoConversaSerializer(conversa_completa(Conversa.objects, request.user).get(pk=conversa.pk)).data
        return Response({**data, "mensagens": [], "proximo_cursor": None}, status=status.HTTP_201_CREATED)


class ConversaDetailView(APIView):
    def get(self, request, pk):
        conversa = get_object_or_404(conversa_completa(conversas_permitidas(request.user), request.user), pk=pk)
        page = pagina_mensagens(request, conversa, parametros(request))
        return Response({**ResumoConversaSerializer(conversa).data, "mensagens": page["resultados"], "proximo_cursor": page["proximo_cursor"]})


class MensagemListView(APIView):
    def get(self, request, pk):
        conversa = get_object_or_404(conversas_permitidas(request.user), pk=pk)
        return Response(pagina_mensagens(request, conversa, parametros(request)))

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
        return Response({"ultima_mensagem_lida_id": leitura.ultima_mensagem_lida_id,
                         "nao_lidas": conversa.mensagens.filter(id__gt=leitura.ultima_mensagem_lida_id).exclude(autor=request.user).count()})


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
