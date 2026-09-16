from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from usuarios.models import Equipe, Usuario, VinculoEquipe


class EquipeSerializer(serializers.ModelSerializer):
    integrantes_ativos = serializers.IntegerField(read_only=True)
    demandas_ativas = serializers.IntegerField(read_only=True)

    class Meta:
        model = Equipe
        fields = ("id", "nome", "arquivada", "criada_em", "integrantes_ativos", "demandas_ativas")


class CriarEquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipe
        fields = ("nome",)

    def validate_nome(self, value):
        return value.strip()


class AtualizarEquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipe
        fields = ("nome", "arquivada")


class VinculoEquipeSerializer(serializers.ModelSerializer):
    equipe_nome = serializers.CharField(source="equipe.nome", read_only=True)

    class Meta:
        model = VinculoEquipe
        fields = ("id", "equipe", "equipe_nome", "papel", "pode_administrar", "ativo", "criado_em", "encerrado_em")


class MembroEquipeSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(read_only=True)

    class Meta:
        model = Usuario
        fields = ("id", "username", "nome", "first_name", "last_name", "email", "perfil", "is_active", "pode_administrar_equipe")
        read_only_fields = ("id", "username", "nome")


class CriarMembroEquipeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=12, trim_whitespace=False)

    class Meta:
        model = Usuario
        fields = ("username", "password", "first_name", "last_name", "email", "perfil", "is_active", "pode_administrar_equipe")

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs.get("pode_administrar_equipe") and attrs.get("perfil") != Usuario.Perfil.GESTOR:
            raise serializers.ValidationError("Somente gestores podem administrar a equipe.")
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(equipe=self.context["equipe"], **validated_data)
        usuario.set_password(password)
        usuario.full_clean(exclude=("password",))
        usuario.save()
        return usuario


class AtualizarMembroEquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ("first_name", "last_name", "email", "perfil", "is_active", "pode_administrar_equipe")

    def validate(self, attrs):
        perfil = attrs.get("perfil", self.instance.perfil)
        administra = attrs.get("pode_administrar_equipe", self.instance.pode_administrar_equipe)
        if administra and perfil != Usuario.Perfil.GESTOR:
            raise serializers.ValidationError("Somente gestores podem administrar a equipe.")
        solicitante = self.context["request"].user
        if self.instance.pk == solicitante.pk:
            if attrs.get("is_active") is False or perfil != Usuario.Perfil.GESTOR or not administra:
                raise serializers.ValidationError("Você não pode desativar, rebaixar ou remover sua própria permissão administrativa.")
        statuses_ativos = ("pendente", "em_andamento", "aguardando_avaliacao", "em_correcao")
        deixa_de_atender = attrs.get("is_active") is False or perfil != Usuario.Perfil.INSPETOR
        if self.instance.perfil == Usuario.Perfil.INSPETOR and deixa_de_atender:
            if self.instance.demandas_atribuidas.filter(status__in=statuses_ativos).exists():
                raise serializers.ValidationError("Reatribua as demandas ativas deste inspetor antes de alterar a conta.")
        return attrs
