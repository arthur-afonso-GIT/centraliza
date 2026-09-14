from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("demandas", "0006_anexodemanda_and_more")]

    operations = [
        migrations.AddField(
            model_name="demanda",
            name="sei_numero",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="demanda",
            name="sei_numero_normalizado",
            field=models.CharField(blank=True, db_index=True, editable=False, max_length=80),
        ),
    ]
