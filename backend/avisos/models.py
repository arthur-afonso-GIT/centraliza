from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Aviso(models.Model):
    class Categoria(models.TextChoices):
        URGENTE = "urgente", "Urgente"
        INFORMATIVO = "informativo", "Informativo"

    titulo = models.CharField(max_length=200)
    resumo = models.CharField(max_length=300)
    conteudo = models.TextField()
    categoria = models.CharField(max_length=12, choices=Categoria.choices)
    equipe = models.ForeignKey("usuarios.Equipe", on_delete=models.PROTECT, related_name="avisos")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="avisos_criados")
    destinatarios = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="avisos_recebidos", blank=True)
    publicado_em = models.DateTimeField()
    expira_em = models.DateTimeField(null=True, blank=True)
    cancelado_em = models.DateTimeField(null=True, blank=True)
    cancelado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="avisos_cancelados", null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    referencia_demo = models.CharField(max_length=60, unique=True, null=True, blank=True, editable=False)

    class Meta:
        ordering = ["categoria", "-publicado_em", "-id"]
        indexes = [
            models.Index(fields=["equipe", "categoria", "publicado_em", "id"], name="aviso_equipe_feed"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(categoria__in=["urgente", "informativo"]),
                name="aviso_categoria_valida",
            ),
        ]

    def clean(self):
        super().clean()
        if not self.autor_id:
            return
        erros = {}
        if self.equipe_id and self.autor.equipe_id != self.equipe_id:
            erros["autor"] = "O autor deve pertencer à equipe do aviso."
        if self.autor.perfil != "gestor":
            erros["autor"] = "O autor do aviso deve ser um gestor."
        if not self.autor.is_active:
            erros["autor"] = "O autor do aviso deve estar ativo."
        if erros:
            raise ValidationError(erros)
        if self.expira_em and self.publicado_em and self.expira_em <= self.publicado_em:
            raise ValidationError({"expira_em": "A vigência final deve ser posterior à publicação."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
