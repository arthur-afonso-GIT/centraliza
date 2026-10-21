from datetime import datetime, time
from zoneinfo import ZoneInfo

from django.db import migrations, models


def validar_referencias_pendentes(schema_editor):
    # PostgreSQL acumula verificações de FKs até o fim da transação.
    # Execute-as antes do próximo ALTER TABLE, preservando a migração atômica.
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.connection.check_constraints()


def guardar_datas(apps, schema_editor):
    Demanda = apps.get_model("demandas", "Demanda")
    Demanda.objects.using(schema_editor.connection.alias).update(prazo_data_legada=models.F("prazo"))
    validar_referencias_pendentes(schema_editor)


def restaurar_horarios(apps, schema_editor):
    Demanda = apps.get_model("demandas", "Demanda")
    for demanda in Demanda.objects.using(schema_editor.connection.alias).all().iterator():
        demanda.prazo = datetime.combine(demanda.prazo_data_legada, time(23, 59), tzinfo=ZoneInfo("America/Fortaleza"))
        demanda.save(update_fields=["prazo"])
    validar_referencias_pendentes(schema_editor)


def guardar_datas_locais(apps, schema_editor):
    Demanda = apps.get_model("demandas", "Demanda")
    for demanda in Demanda.objects.using(schema_editor.connection.alias).all().iterator():
        demanda.prazo_data_legada = demanda.prazo.astimezone(ZoneInfo("America/Fortaleza")).date()
        demanda.save(update_fields=["prazo_data_legada"])
    validar_referencias_pendentes(schema_editor)


def restaurar_datas(apps, schema_editor):
    Demanda = apps.get_model("demandas", "Demanda")
    Demanda.objects.using(schema_editor.connection.alias).update(prazo=models.F("prazo_data_legada"))
    validar_referencias_pendentes(schema_editor)


class Migration(migrations.Migration):
    dependencies = [("demandas", "0012_solicitacaoparticipacao")]
    operations = [
        migrations.AddField(model_name="demanda", name="prazo_data_legada", field=models.DateField(null=True)),
        migrations.RunPython(guardar_datas, restaurar_datas),
        migrations.AlterField(model_name="demanda", name="prazo", field=models.DateTimeField()),
        migrations.RunPython(restaurar_horarios, guardar_datas_locais),
        migrations.RemoveField(model_name="demanda", name="prazo_data_legada"),
    ]
