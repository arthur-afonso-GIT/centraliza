import demandas.models
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('demandas', '0005_remove_eventodemanda_evento_conteudo_por_tipo_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AnexoDemanda',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('arquivo', models.FileField(max_length=500, upload_to=demandas.models.caminho_anexo)),
                ('nome_original', models.CharField(max_length=255)),
                ('mime_type', models.CharField(max_length=100)),
                ('tamanho', models.PositiveBigIntegerField()),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('removido_em', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'ordering': ['-criado_em', '-id'],
            },
        ),
        migrations.RemoveConstraint(
            model_name='eventodemanda',
            name='evento_conteudo_por_tipo',
        ),
        migrations.AlterField(
            model_name='eventodemanda',
            name='tipo',
            field=models.CharField(choices=[('demanda_criada', 'Demanda criada'), ('demanda_editada', 'Demanda editada'), ('responsavel_alterado', 'Responsável alterado'), ('status_alterado', 'Status alterado'), ('comentario', 'Comentário'), ('anexo_adicionado', 'Anexo adicionado'), ('anexo_removido', 'Anexo removido')], max_length=20),
        ),
        migrations.AddConstraint(
            model_name='eventodemanda',
            constraint=models.CheckConstraint(condition=models.Q(models.Q(('status_anterior__gt', ''), ('status_novo__gt', ''), ('tipo', 'status_alterado')), models.Q(('status_anterior', ''), ('status_novo', ''), ('texto__gt', ''), ('tipo', 'comentario')), models.Q(('status_anterior', ''), ('status_novo', ''), ('texto__gt', ''), ('tipo__in', ['demanda_criada', 'demanda_editada', 'responsavel_alterado', 'anexo_adicionado', 'anexo_removido'])), _connector='OR'), name='evento_conteudo_por_tipo'),
        ),
        migrations.AddField(
            model_name='anexodemanda',
            name='autor',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='anexos_demandas', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='anexodemanda',
            name='demanda',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='anexos', to='demandas.demanda'),
        ),
        migrations.AddField(
            model_name='anexodemanda',
            name='removido_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='anexos_demandas_removidos', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='anexodemanda',
            index=models.Index(fields=['demanda', 'removido_em', '-criado_em'], name='anexo_demanda_ativo'),
        ),
    ]
