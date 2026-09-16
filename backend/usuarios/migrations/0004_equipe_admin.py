from django.db import migrations, models
import django.db.models.deletion


def preencher_criadores(apps, schema_editor):
    Equipe = apps.get_model("usuarios", "Equipe")
    Usuario = apps.get_model("usuarios", "Usuario")
    for equipe in Equipe.objects.all():
        equipe.criada_por = Usuario.objects.filter(equipe_id=equipe.id, perfil="gestor").order_by("id").first()
        equipe.save(update_fields=["criada_por"])


class Migration(migrations.Migration):
    dependencies = [("usuarios", "0003_vinculoequipe")]
    operations = [
        migrations.AddField(model_name="equipe", name="arquivada", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="equipe", name="criada_em", field=models.DateTimeField(auto_now_add=True, null=True)),
        migrations.AddField(model_name="equipe", name="criada_por", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="equipes_criadas", to="usuarios.usuario")),
        migrations.RunPython(preencher_criadores, migrations.RunPython.noop),
        migrations.AlterField(model_name="equipe", name="criada_em", field=models.DateTimeField(auto_now_add=True)),
    ]
