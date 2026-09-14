from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class Equipe(models.Model):
    nome = models.CharField(max_length=120, unique=True)

    def __str__(self):
        return self.nome


class Usuario(AbstractUser):
    class Perfil(models.TextChoices):
        GESTOR = "gestor", "Gestor"
        INSPETOR = "inspetor", "Inspetor"

    perfil = models.CharField(max_length=10, choices=Perfil.choices, default=Perfil.INSPETOR)
    equipe = models.ForeignKey(Equipe, on_delete=models.PROTECT, null=True, blank=True)
    pode_administrar_equipe = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(perfil__in=["gestor", "inspetor"]), name="usuario_perfil_valido"),
            models.CheckConstraint(
                condition=models.Q(pode_administrar_equipe=False) | models.Q(perfil="gestor", equipe__isnull=False),
                name="usuario_admin_equipe_valido",
            ),
        ]

    def clean(self):
        super().clean()
        if self.pode_administrar_equipe and (self.perfil != self.Perfil.GESTOR or not self.equipe_id):
            raise ValidationError({"pode_administrar_equipe": "A administração da equipe exige um gestor vinculado a uma equipe."})

    @property
    def nome(self):
        return self.get_full_name() or self.username
