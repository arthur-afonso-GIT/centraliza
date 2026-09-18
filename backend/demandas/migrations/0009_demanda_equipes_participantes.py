from django.db import migrations, models


def copiar_equipes_principais(apps, schema_editor):
    Demanda = apps.get_model("demandas", "Demanda")
    for demanda in Demanda.objects.only("id", "equipe_id").iterator():
        demanda.equipes_participantes.add(demanda.equipe_id)


class Migration(migrations.Migration):
    dependencies = [("demandas", "0008_importacaosei")]
    operations = [
        migrations.AddField(model_name="demanda", name="equipes_participantes", field=models.ManyToManyField(blank=True, related_name="demandas_participantes", to="usuarios.equipe")),
        migrations.RunPython(copiar_equipes_principais, migrations.RunPython.noop),
    ]
