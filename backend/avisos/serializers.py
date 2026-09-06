from zoneinfo import ZoneInfo

from rest_framework import serializers

from avisos.models import Aviso


class AvisoFeedSerializer(serializers.ModelSerializer):
    autor = serializers.CharField(source="autor.nome", read_only=True)
    publicado_em = serializers.SerializerMethodField()

    class Meta:
        model = Aviso
        fields = ["id", "titulo", "resumo", "categoria", "autor", "publicado_em"]

    def get_publicado_em(self, obj):
        return obj.publicado_em.astimezone(ZoneInfo("America/Fortaleza")).isoformat()


class AvisoDetalheSerializer(AvisoFeedSerializer):
    class Meta(AvisoFeedSerializer.Meta):
        fields = AvisoFeedSerializer.Meta.fields + ["conteudo"]
