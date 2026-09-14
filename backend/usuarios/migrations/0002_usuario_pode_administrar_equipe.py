from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("usuarios", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="usuario",
            name="pode_administrar_equipe",
            field=models.BooleanField(default=False),
        ),
        migrations.AddConstraint(
            model_name="usuario",
            constraint=models.CheckConstraint(
                condition=models.Q(pode_administrar_equipe=False) | models.Q(perfil="gestor", equipe__isnull=False),
                name="usuario_admin_equipe_valido",
            ),
        ),
    ]
