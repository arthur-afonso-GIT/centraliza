# URLs do deploy — Render e Vercel

O plano de demonstração usa **Render PostgreSQL** para o banco, **Render Web Service** para a API Django e **Vercel** para o frontend. O banco não tem URL pública de aplicação: o Render fornece `DATABASE_URL` diretamente ao serviço da API. O Centraliza usa login e sessões do Django, sem Supabase Auth.

| Serviço | Endereço | Uso |
| --- | --- | --- |
| Render PostgreSQL | `DATABASE_URL` interna | Conexão da API, fornecida automaticamente pelo Blueprint |
| Render API | `https://centraliza-api-f5us.onrender.com` | API Django e `/api/health/` |
| Vercel | `https://centralizavisat.vercel.app` | Domínio gratuito atual do frontend |

## Ordem de configuração

1. No Render, importe o repositório como **Blueprint** usando [`render.yaml`](../render.yaml). Ele cria `centraliza-db` e `centraliza-api`, injeta `DATABASE_URL`, gera `DJANGO_SECRET_KEY` e inicia as migrações do Django. Escolha a região disponível mais próxima dos usuários para ambos os serviços.
2. Depois do deploy, anote a URL HTTPS da API e confira `https://<nome-da-api>.onrender.com/api/health/`. O host `onrender.com` do serviço é adicionado automaticamente a `ALLOWED_HOSTS` por `RENDER_EXTERNAL_HOSTNAME`.
3. Na Vercel, escolha **Add New → Project**, importe este repositório e configure **Root Directory** como `frontend`. Use **Framework Preset: Other**, **Install Command: `npm ci`** e **Build Command: `npm run build`**. O projeto seleciona Nitro no build da Vercel e usa Node 24. Não configure um diretório de saída manualmente.
4. O rewrite externo em `frontend/vercel.json` encaminha `/api/*` ao Render pelo mesmo domínio do frontend. Faça o deploy e anote a URL `https://<nome-do-site>.vercel.app`. `CENTRALIZA_API_URL` é usada apenas no desenvolvimento local.
5. Na Vercel, remova `centralizavisat.app` de **Settings → Domains** se esse domínio não estiver registrado. Confirme que o endereço gratuito `.vercel.app` abre sem redirecionar para ele.
6. No Render, defina `DJANGO_CSRF_TRUSTED_ORIGINS=https://centralizavisat.vercel.app` nas variáveis do serviço `centraliza-api` e faça redeploy.
7. Teste login, criação de demanda, Chats e logout pelo domínio principal. Para uma URL de preview, registre cada origem HTTPS adicional em `DJANGO_CSRF_TRUSTED_ORIGINS` e cada hostname real da API em `DJANGO_ALLOWED_HOSTS`.

O plano gratuito do Render serve para demonstração: o banco gratuito expira após 30 dias e o sistema de arquivos do serviço web é efêmero. Os anexos de demandas precisam de armazenamento persistente antes de qualquer uso real. Não carregue dados institucionais na demonstração.

O Render já redireciona HTTP para HTTPS na borda. A API desativa o redirecionamento adicional do Django apenas quando `RENDER=true`, evitando um ciclo de redirecionamentos através do rewrite externo da Vercel; cookies seguros e HSTS continuam ativos.
