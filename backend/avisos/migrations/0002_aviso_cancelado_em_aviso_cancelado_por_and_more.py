import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('avisos', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='aviso',
            name='cancelado_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='aviso',
            name='cancelado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='avisos_cancelados', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='aviso',
            name='destinatarios',
            field=models.ManyToManyField(blank=True, related_name='avisos_recebidos', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='aviso',
            name='expira_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
