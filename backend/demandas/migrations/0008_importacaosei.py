from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("demandas", "0007_demanda_sei_numero"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ImportacaoSei",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("origem", models.CharField(choices=[("texto", "Texto colado"), ("extensao", "Extensão do navegador")], default="texto", max_length=10)),
                ("status", models.CharField(choices=[("validada", "Validada"), ("com_erros", "Com erros"), ("confirmada", "Confirmada"), ("descartada", "Descartada")], max_length=12)),
                ("conteudo_bruto", models.TextField(blank=True)),
                ("campos", models.JSONField(default=dict)),
                ("avisos", models.JSONField(default=list)),
                ("erros", models.JSONField(default=list)),
                ("criada_em", models.DateTimeField(auto_now_add=True)),
                ("expira_em", models.DateTimeField()),
                ("confirmada_em", models.DateTimeField(blank=True, null=True)),
                ("descartada_em", models.DateTimeField(blank=True, null=True)),
                ("demanda", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="importacoes_sei", to="demandas.demanda")),
                ("equipe", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="importacoes_sei", to="usuarios.equipe")),
                ("usuario", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="importacoes_sei", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-criada_em", "-id"]},
        ),
        migrations.AddIndex(
            model_name="importacaosei",
            index=models.Index(fields=["equipe", "usuario", "status", "-criada_em"], name="import_sei_acesso"),
        ),
        migrations.AddConstraint(
            model_name="importacaosei",
            constraint=models.CheckConstraint(condition=models.Q(("status__in", ["validada", "com_erros", "confirmada", "descartada"])), name="import_sei_status_valido"),
        ),
    ]
