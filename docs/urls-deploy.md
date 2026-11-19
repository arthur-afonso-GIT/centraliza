# URLs do deploy — Render e Vercel

O plano de demonstração usa **Render PostgreSQL** para o banco, **Render Web Service** para a API Django e **Vercel** para o frontend. O banco não tem URL pública de aplicação: o Render fornece `DATABASE_URL` diretamente ao serviço da API. O Centraliza usa login e sessões do Django, sem Supabase Auth.

| Serviço | Endereço | Uso |
| --- | --- | --- |
| Render PostgreSQL | `DATABASE_URL` interna | Conexão da API, fornecida automaticamente pelo Blueprint |
| Render API | `https://centraliza-api-f5us.onrender.com` | API Django e `/api/health/` |
| Vercel | `https://centralizavisat.app` | Domínio principal do frontend; `centraliza-eight.vercel.app` redireciona para ele |

## Ordem de configuração

1. No Render, importe o repositório como **Blueprint** usando [`render.yaml`](../render.yaml). Ele cria `centraliza-db` e `centraliza-api`, injeta `DATABASE_URL`, gera `DJANGO_SECRET_KEY` e inicia as migrações do Django. Escolha a região disponível mais próxima dos usuários para ambos os serviços.
2. Depois do deploy, anote a URL HTTPS da API e confira `https://<nome-da-api>.onrender.com/api/health/`. O host `onrender.com` do serviço é adicionado automaticamente a `ALLOWED_HOSTS` por `RENDER_EXTERNAL_HOSTNAME`.
3. Na Vercel, escolha **Add New → Project**, importe este repositório e configure **Root Directory** como `frontend`. Use **Framework Preset: Other**, **Install Command: `npm ci`** e **Build Command: `npm run build`**. O projeto seleciona Nitro no build da Vercel e usa Node 24. Não configure um diretório de saída manualmente.
4. Em **Environment Variables** da Vercel, adicione `CENTRALIZA_API_URL=https://centraliza-api-f5us.onrender.com` para Production e Preview. O Nitro encaminha `/api/*` ao Render pelo mesmo domínio do frontend. Faça o deploy e anote a URL `https://<nome-do-site>.vercel.app`.
5. Na Vercel, abra **Settings → Domains → centralizavisat.app → View DNS configuration** e configure no provedor de DNS os registros exatos exibidos. Aguarde o domínio aparecer como **Valid Configuration** e o HTTPS ficar ativo.
6. No Render, adicione `DJANGO_CSRF_TRUSTED_ORIGINS=https://centralizavisat.app,https://centraliza-eight.vercel.app` às variáveis do serviço `centraliza-api` e faça redeploy. Isso permite as requisições autenticadas enviadas pelos domínios da Vercel.
7. Teste login, criação de demanda, Chats e logout pelo domínio principal. Para uma URL de preview, registre cada origem HTTPS adicional em `DJANGO_CSRF_TRUSTED_ORIGINS` e cada hostname real da API em `DJANGO_ALLOWED_HOSTS`.

O plano gratuito do Render serve para demonstração: o banco gratuito expira após 30 dias e o sistema de arquivos do serviço web é efêmero. Os anexos de demandas precisam de armazenamento persistente antes de qualquer uso real. Não carregue dados institucionais na demonstração.
