from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Demanda(models.Model):
    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        CONCLUIDA = "concluida", "Concluída"
        CANCELADA = "cancelada", "Cancelada"

    class Prioridade(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Média"
        ALTA = "alta", "Alta"

    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    prioridade = models.CharField(max_length=10, choices=Prioridade.choices, default=Prioridade.MEDIA)
    prazo = models.DateField()
    critica = models.BooleanField(default=False)
    equipe = models.ForeignKey("usuarios.Equipe", on_delete=models.PROTECT)
    criador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="demandas_criadas")
    responsavel = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="demandas_atribuidas", null=True, blank=True)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)
    # Chave restrita à carga fictícia, permitindo repeti-la sem duplicar registros.
    referencia_demo = models.CharField(max_length=60, unique=True, null=True, blank=True, editable=False)

    class Meta:
        ordering = ["prazo", "id"]
        indexes = [
            models.Index(fields=["equipe", "status", "prazo", "id"], name="demanda_equipe_status"),
            models.Index(fields=["responsavel", "status", "prazo", "id"], name="demanda_resp_status"),
            models.Index(fields=["equipe", "critica", "prazo", "id"], name="demanda_equipe_critica"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(status__in=["pendente", "em_andamento", "concluida", "cancelada"]), name="demanda_status_valido"),
            models.CheckConstraint(condition=models.Q(prioridade__in=["baixa", "media", "alta"]), name="demanda_prioridade_valida"),
        ]

    def clean(self):
        super().clean()
        for campo in ("criador", "responsavel"):
            usuario = getattr(self, campo) if getattr(self, f"{campo}_id") else None
            if usuario and usuario.equipe_id != self.equipe_id:
                raise ValidationError({campo: "O usuário deve pertencer à equipe da demanda."})
        if self.responsavel_id and self.responsavel.perfil != "inspetor":
            raise ValidationError({"responsavel": "Atribua a demanda a um inspetor."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
