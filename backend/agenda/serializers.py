from zoneinfo import ZoneInfo

from rest_framework import serializers

from agenda.models import Compromisso


class ParticipanteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class CompromissoSerializer(serializers.ModelSerializer):
    participantes = ParticipanteSerializer(many=True, read_only=True)
    inicio = serializers.SerializerMethodField()
    fim = serializers.SerializerMethodField()

    class Meta:
        model = Compromisso
        fields = ["id", "titulo", "descricao", "tipo", "inicio", "fim", "participantes"]

    def get_inicio(self, obj):
        return obj.inicio.astimezone(ZoneInfo("America/Fortaleza")).isoformat()

    def get_fim(self, obj):
        return obj.fim.astimezone(ZoneInfo("America/Fortaleza")).isoformat()
