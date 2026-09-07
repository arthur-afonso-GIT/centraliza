from zoneinfo import ZoneInfo

from rest_framework import serializers
from django.utils.dateparse import parse_datetime

from agenda.models import Compromisso
from demandas.models import Demanda
from usuarios.models import Usuario


class ParticipanteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class DataHoraComOffsetField(serializers.DateTimeField):
    def to_internal_value(self, value):
        parsed = parse_datetime(value) if isinstance(value, str) else None
        if parsed is None or parsed.tzinfo is None or parsed.utcoffset() is None:
            self.fail("invalid", format="ISO 8601 com offset")
        return super().to_internal_value(value)


class CompromissoSerializer(serializers.ModelSerializer):
    participantes = ParticipanteSerializer(many=True, read_only=True)
    inicio = serializers.SerializerMethodField()
    fim = serializers.SerializerMethodField()

    class Meta:
        model = Compromisso
        fields = ["id", "titulo", "descricao", "tipo", "inicio", "fim", "participantes", "demanda", "cancelado_em"]

    def get_inicio(self, obj):
        return obj.inicio.astimezone(ZoneInfo("America/Fortaleza")).isoformat()

    def get_fim(self, obj):
        return obj.fim.astimezone(ZoneInfo("America/Fortaleza")).isoformat()


class GerenciarCompromissoSerializer(serializers.Serializer):
    titulo = serializers.CharField(max_length=200, required=False)
    descricao = serializers.CharField(allow_blank=True, required=False)
    tipo = serializers.ChoiceField(choices=Compromisso.Tipo.choices, required=False)
    inicio = DataHoraComOffsetField(required=False)
    fim = DataHoraComOffsetField(required=False)
    participante_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False, required=False)
    demanda_id = serializers.IntegerField(min_value=1, allow_null=True, required=False)

    def validate(self, attrs):
        request = self.context["request"]
        if "participante_ids" in attrs:
            ids = list(dict.fromkeys(attrs.pop("participante_ids")))
            participantes = list(Usuario.objects.filter(id__in=ids, equipe_id=request.user.equipe_id, is_active=True))
            if len(participantes) != len(ids):
                raise serializers.ValidationError({"participante_ids": "Selecione somente participantes ativos da sua equipe."})
            attrs["participantes"] = participantes
        if "demanda_id" in attrs:
            demanda_id = attrs.pop("demanda_id")
            if demanda_id is None:
                attrs["demanda"] = None
            else:
                try:
                    attrs["demanda"] = Demanda.objects.get(id=demanda_id, equipe_id=request.user.equipe_id)
                except Demanda.DoesNotExist as exc:
                    raise serializers.ValidationError({"demanda_id": "Selecione uma demanda da sua equipe."}) from exc
        return attrs
