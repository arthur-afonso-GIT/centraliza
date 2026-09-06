from rest_framework import serializers

from demandas.models import Demanda


class ResponsavelSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class DemandaSerializer(serializers.ModelSerializer):
    responsavel = ResponsavelSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Demanda
        fields = ["id", "titulo", "status", "prioridade", "prazo", "critica", "responsavel"]
