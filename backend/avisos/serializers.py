from zoneinfo import ZoneInfo

from rest_framework import serializers

from avisos.models import Aviso
from usuarios.models import Usuario


class AvisoFeedSerializer(serializers.ModelSerializer):
    autor = serializers.CharField(source="autor.nome", read_only=True)
    publicado_em = serializers.SerializerMethodField()
    expira_em = serializers.SerializerMethodField()
    destinatarios = serializers.SerializerMethodField()

    class Meta:
        model = Aviso
        fields = ["id", "titulo", "resumo", "categoria", "autor", "publicado_em", "expira_em", "destinatarios"]

    def get_publicado_em(self, obj):
        return obj.publicado_em.astimezone(ZoneInfo("America/Fortaleza")).isoformat()

    def get_expira_em(self, obj):
        return obj.expira_em.astimezone(ZoneInfo("America/Fortaleza")).isoformat() if obj.expira_em else None

    def get_destinatarios(self, obj):
        return [{"id": item.id, "nome": item.nome} for item in obj.destinatarios.all()]


class AvisoDetalheSerializer(AvisoFeedSerializer):
    class Meta(AvisoFeedSerializer.Meta):
        fields = AvisoFeedSerializer.Meta.fields + ["conteudo"]


class GerenciarAvisoSerializer(serializers.Serializer):
    titulo = serializers.CharField(max_length=200, required=False)
    resumo = serializers.CharField(max_length=300, required=False)
    conteudo = serializers.CharField(required=False)
    categoria = serializers.ChoiceField(choices=Aviso.Categoria.choices, required=False)
    publicado_em = serializers.DateTimeField(required=False)
    expira_em = serializers.DateTimeField(allow_null=True, required=False)
    destinatario_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False)

    def validate(self, attrs):
        inicio = attrs.get("publicado_em", self.context.get("instance").publicado_em if self.context.get("instance") else None)
        fim = attrs.get("expira_em", self.context.get("instance").expira_em if self.context.get("instance") else None)
        if inicio and fim and fim <= inicio:
            raise serializers.ValidationError({"expira_em": "A vigência final deve ser posterior à publicação."})
        if "destinatario_ids" in attrs:
            ids = list(dict.fromkeys(attrs.pop("destinatario_ids")))
            user = self.context["request"].user
            destinatarios = list(Usuario.objects.filter(id__in=ids, equipe_id=user.equipe_id, perfil="inspetor", is_active=True))
            if len(destinatarios) != len(ids):
                raise serializers.ValidationError({"destinatario_ids": "Selecione somente inspetores ativos da sua equipe."})
            attrs["destinatarios"] = destinatarios
        return attrs
