from rest_framework import serializers
from django.utils import timezone

from demandas.models import AnexoDemanda, Demanda, EventoDemanda, ImportacaoSei
from demandas.identidade_sei import normalizar_numero_sei


class ResponsavelSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class DemandaSerializer(serializers.ModelSerializer):
    responsavel = ResponsavelSerializer(read_only=True, allow_null=True)
    atrasada = serializers.SerializerMethodField()
    equipes_ids = serializers.SerializerMethodField()

    class Meta:
        model = Demanda
        fields = ["id", "titulo", "sei_numero", "status", "prioridade", "prazo", "critica", "atrasada", "responsavel", "equipes_ids"]

    def get_equipes_ids(self, obj):
        return list(obj.equipes_participantes.values_list("id", flat=True))

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
    sei_numero = serializers.CharField(max_length=80, allow_blank=True, required=False, trim_whitespace=True)
    descricao = serializers.CharField(allow_blank=True, required=False)
    origem = serializers.CharField(max_length=200, allow_blank=True, required=False)
    prioridade = serializers.ChoiceField(choices=Demanda.Prioridade.choices, required=False)
    prazo = serializers.DateField(required=False)
    critica = serializers.BooleanField(required=False)
    responsavel_id = serializers.IntegerField(allow_null=True, required=False)

    def validate_sei_numero(self, value):
        if value and not normalizar_numero_sei(value):
            raise serializers.ValidationError("Informe ao menos uma letra ou número.")
        return value

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


class CriarImportacaoSeiSerializer(serializers.Serializer):
    texto = serializers.CharField(max_length=20000, allow_blank=False, trim_whitespace=True)


class CamposImportacaoSeiSerializer(serializers.Serializer):
    sei_numero = serializers.CharField(max_length=80, allow_blank=False, trim_whitespace=True)
    assunto = serializers.CharField(max_length=500, allow_blank=True, required=False, trim_whitespace=True)
    tipo_processo = serializers.CharField(max_length=200, allow_blank=True, required=False, trim_whitespace=True)
    unidade = serializers.CharField(max_length=200, allow_blank=True, required=False, trim_whitespace=True)
    data_autuacao = serializers.DateField(allow_null=True, required=False)

    def validate_sei_numero(self, value):
        if not normalizar_numero_sei(value):
            raise serializers.ValidationError("Informe ao menos uma letra ou número.")
        return value


class ImportacaoSeiSerializer(serializers.ModelSerializer):
    demanda_id = serializers.IntegerField(read_only=True, allow_null=True)
    possiveis_duplicidades = serializers.SerializerMethodField()

    class Meta:
        model = ImportacaoSei
        fields = [
            "id", "origem", "status", "campos", "avisos", "erros",
            "possiveis_duplicidades", "demanda_id", "criada_em", "expira_em", "confirmada_em",
        ]

    def get_possiveis_duplicidades(self, obj):
        normalizado = normalizar_numero_sei(str(obj.campos.get("sei_numero", "")))
        if not normalizado:
            return []
        queryset = Demanda.objects.filter(
            equipe_id=obj.equipe_id, sei_numero_normalizado=normalizado,
        ).order_by("id")[:10]
        return [
            {"id": item.id, "titulo": item.titulo, "status": item.status, "sei_numero": item.sei_numero}
            for item in queryset
        ]
