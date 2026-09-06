from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Compromisso(models.Model):
    class Tipo(models.TextChoices):
        REUNIAO = "reuniao", "Reunião"
        ATIVIDADE = "atividade", "Atividade"

    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    tipo = models.CharField(max_length=12, choices=Tipo.choices)
    inicio = models.DateTimeField()
    fim = models.DateTimeField()
    equipe = models.ForeignKey("usuarios.Equipe", on_delete=models.PROTECT, related_name="compromissos")
    criador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="compromissos_criados")
    participantes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="compromissos")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    referencia_demo = models.CharField(max_length=60, unique=True, null=True, blank=True, editable=False)

    class Meta:
        ordering = ["inicio", "fim", "id"]
        indexes = [
            models.Index(fields=["equipe", "inicio", "fim", "id"], name="comp_equipe_intervalo"),
            models.Index(fields=["inicio", "fim", "id"], name="comp_intervalo"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(fim__gt=models.F("inicio")), name="comp_fim_apos_inicio"),
            models.CheckConstraint(condition=models.Q(tipo__in=["reuniao", "atividade"]), name="comp_tipo_valido"),
        ]

    def clean(self):
        super().clean()
        if self.criador_id and self.equipe_id and self.criador.equipe_id != self.equipe_id:
            raise ValidationError({"criador": "O criador deve pertencer à equipe do compromisso."})
        if self.inicio and self.fim and self.fim <= self.inicio:
            raise ValidationError({"fim": "O fim deve ser posterior ao início."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

# Create your models here.
