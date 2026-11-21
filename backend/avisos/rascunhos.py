from rest_framework import exceptions, generics, serializers

from avisos.models import RascunhoAviso


class RascunhoAvisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RascunhoAviso
        fields = ["id", "titulo", "conteudo", "criado_em", "atualizado_em"]
        read_only_fields = ["id", "criado_em", "atualizado_em"]

    def validate(self, attrs):
        desconhecidos = set(self.initial_data) - {"titulo", "conteudo"}
        if desconhecidos:
            raise serializers.ValidationError("Informe somente título e conteúdo do rascunho.")
        return attrs


class RascunhoAvisoMixin:
    serializer_class = RascunhoAvisoSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if not user.is_active or user.perfil not in {"inspetor", "gestor"} or not user.equipe_id:
            raise exceptions.PermissionDenied("Somente inspetores e coordenadores de uma equipe podem acessar rascunhos.")
        return RascunhoAviso.objects.filter(autor_id=user.pk, equipe_id=user.equipe_id)

    def perform_create(self, serializer):
        self.get_queryset()  # Aplica as mesmas permissões de consulta à criação.
        serializer.save(autor=self.request.user, equipe_id=self.request.user.equipe_id)


class RascunhoAvisoListView(RascunhoAvisoMixin, generics.ListCreateAPIView):
    pass


class RascunhoAvisoDetailView(RascunhoAvisoMixin, generics.RetrieveUpdateAPIView):
    http_method_names = ["get", "patch", "head", "options"]
