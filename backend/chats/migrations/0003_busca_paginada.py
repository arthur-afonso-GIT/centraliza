from django.db import migrations, models
from django.contrib.postgres.operations import TrigramExtension


class Migration(migrations.Migration):
    dependencies = [("chats", "0002_mensagemconversa_client_id_and_more")]
    operations = [
        TrigramExtension(),
        migrations.RunSQL(
            r"""CREATE FUNCTION centraliza_chat_normalize(text) RETURNS text
            LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
            SELECT lower(regexp_replace(normalize($1, NFD), U&'[\0300-\036f]', '', 'g'))
            $$""",
            "DROP FUNCTION centraliza_chat_normalize(text)",
        ),
        migrations.RunSQL(
            "CREATE INDEX chat_titulo_busca ON chats_conversa USING gin (centraliza_chat_normalize(titulo) gin_trgm_ops)",
            "DROP INDEX chat_titulo_busca",
        ),
        migrations.RunSQL(
            "CREATE INDEX chat_texto_busca ON chats_mensagemconversa USING gin (centraliza_chat_normalize(texto) gin_trgm_ops)",
            "DROP INDEX chat_texto_busca",
        ),
        migrations.AddIndex(model_name="conversa", index=models.Index(fields=["equipe", "-criada_em", "-id"], name="conversa_equipe_criada")),
    ]
