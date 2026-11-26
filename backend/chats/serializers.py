from rest_framework import serializers

from chats.models import Conversa, MensagemConversa
from usuarios.models import Usuario
from django.db.models import Q


def membros_ativos(equipe_id):
    return Usuario.objects.filter(is_active=True).filter(
        Q(vinculos_equipe__equipe_id=equipe_id, vinculos_equipe__ativo=True)
        | Q(equipe_id=equipe_id, vinculos_equipe__isnull=True)
    ).distinct()


class MembroChatSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(read_only=True)

    class Meta:
        model = Usuario
        fields = ("id", "nome")


class MensagemSerializer(serializers.ModelSerializer):
    autor_id = serializers.IntegerField(read_only=True)
    autor_nome = serializers.CharField(source="autor.nome", read_only=True)

    class Meta:
        model = MensagemConversa
        fields = ("id", "texto", "criada_em", "autor_id", "autor_nome")


class ConversaSerializer(serializers.ModelSerializer):
    participantes = MembroChatSerializer(many=True, read_only=True)
    mensagens = MensagemSerializer(many=True, read_only=True)
    ultima_mensagem_lida_id = serializers.SerializerMethodField()
    nao_lidas = serializers.SerializerMethodField()

    class Meta:
        model = Conversa
        fields = ("id", "titulo", "criada_em", "atualizada_em", "participantes", "mensagens", "ultima_mensagem_lida_id", "nao_lidas")

    def get_ultima_mensagem_lida_id(self, obj):
        leituras = obj.leituras_usuario
        return leituras[0].ultima_mensagem_lida_id if leituras else 0

    def get_nao_lidas(self, obj):
        cursor = self.get_ultima_mensagem_lida_id(obj)
        usuario_id = self.context["request"].user.id
        return sum(m.id > cursor and m.autor_id != usuario_id for m in obj.mensagens.all())


class MarcarLeituraSerializer(serializers.Serializer):
    mensagem_id = serializers.IntegerField(min_value=1, max_value=9223372036854775807)


class CriarConversaSerializer(serializers.Serializer):
    titulo = serializers.CharField(max_length=160, trim_whitespace=True)
    participante_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)

    def validate_participante_ids(self, ids):
        user = self.context["request"].user
        ids = set(ids) - {user.id}
        if not ids:
            raise serializers.ValidationError("Selecione ao menos outra pessoa da equipe.")
        if membros_ativos(user.equipe_id).filter(pk__in=ids).count() != len(ids):
            raise serializers.ValidationError("Selecione somente integrantes ativos da equipe.")
        return sorted(ids)


class CriarMensagemSerializer(serializers.Serializer):
    texto = serializers.CharField(max_length=4000, trim_whitespace=True)
