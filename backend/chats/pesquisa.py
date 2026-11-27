"""Busca no PostgreSQL e paginação keyset limitada, com cursor por usuário/filtro."""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
import unicodedata

from django.core import signing
from django.db.models import CharField, Exists, Func, OuterRef, Q, Value
from django.db.models.functions import Concat
from rest_framework import serializers

from chats.models import Conversa, MensagemConversa
from usuarios.models import Usuario


class Normalizar(Func):
    function = "centraliza_chat_normalize"
    output_field = CharField()


class Parametros(serializers.Serializer):
    palavra = serializers.CharField(required=False, default="", allow_blank=True, max_length=200)
    inicio = serializers.DateField(required=False)
    fim = serializers.DateField(required=False)
    participante = serializers.IntegerField(required=False, min_value=1)
    limite = serializers.IntegerField(required=False, default=30, min_value=1, max_value=100)
    cursor = serializers.CharField(required=False, max_length=2048)
    apos = serializers.IntegerField(required=False, min_value=0)

    def validate(self, attrs):
        if attrs.get("inicio") and attrs.get("fim") and attrs["inicio"] > attrs["fim"]:
            raise serializers.ValidationError("A data inicial não pode ser posterior à data final.")
        if attrs.get("fim") and attrs["fim"].year == 9999:
            raise serializers.ValidationError("Data final fora do intervalo permitido.")
        return attrs


def parametros(request):
    serializer = Parametros(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def periodo(p, prefix="criada_em"):
    tz = ZoneInfo("America/Fortaleza")
    condition = Q()
    if "inicio" in p:
        condition &= Q(**{prefix + "__gte": datetime.combine(p["inicio"], time.min, tz)})
    if "fim" in p:
        condition &= Q(**{prefix + "__lt": datetime.combine(p["fim"] + timedelta(days=1), time.min, tz)})
    return condition


def palavra(p):
    return "".join(c for c in unicodedata.normalize("NFD", p["palavra"].lower()) if not "\u0300" <= c <= "\u036f")


def filtrar_conversas(qs, p):
    # qs já está restrito à equipe/participação. EXISTS evita duplicatas por joins.
    if "participante" in p:
        qs = qs.filter(Exists(Conversa.participantes.through.objects.filter(
            conversa_id=OuterRef("pk"), usuario_id=p["participante"])))
    busca = palavra(p)
    if busca:
        mensagens = MensagemConversa.objects.filter(conversa_id=OuterRef("pk")).alias(
            busca=Normalizar("texto")).filter(busca__contains=busca)
        pessoas = Usuario.objects.filter(conversas=OuterRef("pk")).alias(
            busca=Normalizar(Concat("first_name", Value(" "), "last_name", Value(" "), "username"))
        ).filter(busca__contains=busca)
        qs = qs.alias(busca=Normalizar("titulo")).filter(Q(busca__contains=busca) | Exists(mensagens) | Exists(pessoas))
    if "inicio" in p or "fim" in p:
        mensagens = MensagemConversa.objects.filter(conversa_id=OuterRef("pk")).filter(periodo(p))
        qs = qs.filter(periodo(p) | Exists(mensagens))
    return qs


def filtrar_mensagens(qs, p):
    if palavra(p):
        qs = qs.alias(busca=Normalizar("texto")).filter(busca__contains=palavra(p))
    if "participante" in p:
        qs = qs.filter(autor_id=p["participante"])
    return qs.filter(periodo(p))


def paginar(qs, request, p, recurso, asc=False):
    # Ordenação imutável por criação/id, nunca por atualizada_em (que muda em envios).
    scope = [request.user.pk, request.user.equipe_id, recurso, asc,
             {k: str(v) for k, v in p.items() if k != "cursor"}]
    if p.get("cursor"):
        try:
            data = signing.loads(p["cursor"], salt="chat-page", max_age=86400)
            if data["scope"] != scope:
                raise ValueError()
            timestamp = datetime.fromisoformat(data["date"])
            key = int(data["id"])
        except (signing.BadSignature, ValueError, KeyError, TypeError):
            raise serializers.ValidationError({"cursor": "Cursor inválido ou expirado. Reinicie a busca."})
        op = "gt" if asc else "lt"
        qs = qs.filter(Q(**{f"criada_em__{op}": timestamp}) | Q(criada_em=timestamp, **{f"id__{op}": key}))
    order = ("criada_em", "id") if asc else ("-criada_em", "-id")
    rows = list(qs.order_by(*order)[:p["limite"] + 1])
    more = len(rows) > p["limite"]
    rows = rows[:p["limite"]]
    cursor = None
    if more:
        cursor = signing.dumps({"scope": scope, "date": rows[-1].criada_em.isoformat(), "id": rows[-1].pk}, salt="chat-page", compress=True)
    return rows, cursor
