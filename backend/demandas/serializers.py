from rest_framework import serializers
from django.utils import timezone

from demandas.models import AnexoDemanda, Demanda, EventoDemanda


class ResponsavelSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class DemandaSerializer(serializers.ModelSerializer):
    responsavel = ResponsavelSerializer(read_only=True, allow_null=True)
    atrasada = serializers.SerializerMethodField()

    class Meta:
        model = Demanda
        fields = ["id", "titulo", "status", "prioridade", "prazo", "critica", "atrasada", "responsavel"]

    def get_atrasada(self, obj):
        return obj.prazo < timezone.localdate() and obj.status not in {Demanda.Status.CONCLUIDA, Demanda.Status.CANCELADA}


class AutorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class EventoDemandaSerializer(serializers.ModelSerializer):
    autor = AutorSerializer(read_only=True)

    class Meta:
        model = EventoDemanda
        fields = ["id", "tipo", "autor", "criado_em", "status_anterior", "status_novo", "texto"]


class DemandaDetalheSerializer(DemandaSerializer):
    historico = EventoDemandaSerializer(many=True, read_only=True)

    class Meta(DemandaSerializer.Meta):
        fields = DemandaSerializer.Meta.fields + ["descricao", "origem", "criada_em", "atualizada_em", "historico"]


class GerenciarDemandaSerializer(serializers.Serializer):
    titulo = serializers.CharField(max_length=200, required=False)
    descricao = serializers.CharField(allow_blank=True, required=False)
    origem = serializers.CharField(max_length=200, allow_blank=True, required=False)
    prioridade = serializers.ChoiceField(choices=Demanda.Prioridade.choices, required=False)
    prazo = serializers.DateField(required=False)
    critica = serializers.BooleanField(required=False)
    responsavel_id = serializers.IntegerField(allow_null=True, required=False)

    def validate_responsavel_id(self, value):
        if value is None:
            return None
        from usuarios.models import Usuario
        user = self.context["request"].user
        try:
            return Usuario.objects.get(id=value, equipe_id=user.equipe_id, perfil="inspetor", is_active=True)
        except Usuario.DoesNotExist as exc:
            raise serializers.ValidationError("Selecione um inspetor ativo da sua equipe.") from exc


class AlterarStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Demanda.Status.choices)
    texto = serializers.CharField(max_length=2000, allow_blank=True, required=False, trim_whitespace=True)


class CriarComentarioSerializer(serializers.Serializer):
    texto = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)


class AnexoDemandaSerializer(serializers.ModelSerializer):
    autor = AutorSerializer(read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = AnexoDemanda
        fields = ["id", "nome_original", "mime_type", "tamanho", "autor", "criado_em", "download_url"]

    def get_download_url(self, obj):
        return f"/api/demandas/{obj.demanda_id}/anexos/{obj.id}/download/"
