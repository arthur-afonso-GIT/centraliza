from django.conf import settings
from django.db import models


class Conversa(models.Model):
    titulo = models.CharField(max_length=160)
    equipe = models.ForeignKey("usuarios.Equipe", on_delete=models.PROTECT, related_name="conversas")
    criador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="conversas_criadas")
    participantes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="conversas")
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-atualizada_em", "-id")
        indexes = [models.Index(fields=("equipe", "-atualizada_em", "-id"), name="conversa_equipe_recente")]


class MensagemConversa(models.Model):
    conversa = models.ForeignKey(Conversa, on_delete=models.CASCADE, related_name="mensagens")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="mensagens_conversa")
    texto = models.CharField(max_length=4000)
    client_id = models.UUIDField(null=True, blank=True)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("criada_em", "id")
        constraints = [models.UniqueConstraint(fields=("conversa", "autor", "client_id"), name="mensagem_envio_unico")]
        indexes = [models.Index(fields=("conversa", "criada_em", "id"), name="mensagem_conversa_data")]


class LeituraConversa(models.Model):
    conversa = models.ForeignKey(Conversa, on_delete=models.CASCADE, related_name="leituras")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="leituras_conversa")
    # Cursor monotônico: não depende da existência futura da mensagem.
    ultima_mensagem_lida_id = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("conversa", "usuario"), name="leitura_conversa_usuario_unica")]
