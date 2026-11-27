from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("chats", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LeituraConversa",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ultima_mensagem_lida_id", models.PositiveBigIntegerField(default=0)),
                ("conversa", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="leituras", to="chats.conversa")),
                ("usuario", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="leituras_conversa", to=settings.AUTH_USER_MODEL)),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("conversa", "usuario"), name="leitura_conversa_usuario_unica")]},
        ),
    ]
