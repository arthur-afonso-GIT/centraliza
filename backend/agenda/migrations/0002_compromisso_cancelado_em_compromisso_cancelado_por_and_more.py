import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('agenda', '0001_initial'),
        ('demandas', '0006_anexodemanda_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='compromisso',
            name='cancelado_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='compromisso',
            name='cancelado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='compromissos_cancelados', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='compromisso',
            name='demanda',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='compromissos', to='demandas.demanda'),
        ),
    ]
