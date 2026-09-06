from rest_framework import serializers

from demandas.models import Demanda, EventoDemanda


class ResponsavelSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class DemandaSerializer(serializers.ModelSerializer):
    responsavel = ResponsavelSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Demanda
        fields = ["id", "titulo", "status", "prioridade", "prazo", "critica", "responsavel"]


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
        fields = DemandaSerializer.Meta.fields + ["descricao", "criada_em", "atualizada_em", "historico"]


class AlterarStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Demanda.Status.choices)
    texto = serializers.CharField(max_length=2000, allow_blank=True, required=False, trim_whitespace=True)


class CriarComentarioSerializer(serializers.Serializer):
    texto = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)
