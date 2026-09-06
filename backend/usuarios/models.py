from django.contrib.auth.models import AbstractUser
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

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(perfil__in=["gestor", "inspetor"]), name="usuario_perfil_valido")]

    @property
    def nome(self):
        return self.get_full_name() or self.username
