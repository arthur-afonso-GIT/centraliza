# URLs do deploy — Render e Vercel

O plano de demonstração usa **Render PostgreSQL** para o banco, **Render Web Service** para a API Django e **Vercel** para o frontend. O banco não tem URL pública de aplicação: o Render fornece `DATABASE_URL` diretamente ao serviço da API. O Centraliza usa login e sessões do Django, sem Supabase Auth.

| Serviço | Endereço | Uso |
| --- | --- | --- |
| Render PostgreSQL | `DATABASE_URL` interna | Conexão da API, fornecida automaticamente pelo Blueprint |
| Render API | `https://<nome-da-api>.onrender.com` | API Django e `/api/health/` |
| Vercel | `https://<nome-do-site>.vercel.app` | Página pública do usuário e origem permitida para CSRF |

## Ordem de configuração

1. No Render, importe o repositório como **Blueprint** usando [`render.yaml`](../render.yaml). Ele cria `centraliza-db` e `centraliza-api`, injeta `DATABASE_URL`, gera `DJANGO_SECRET_KEY` e inicia as migrações do Django. Escolha a região disponível mais próxima dos usuários para ambos os serviços.
2. Depois do deploy, anote a URL HTTPS da API e confira `https://<nome-da-api>.onrender.com/api/health/`. O host `onrender.com` do serviço é adicionado automaticamente a `ALLOWED_HOSTS` por `RENDER_EXTERNAL_HOSTNAME`.
3. Prepare o frontend para a Vercel. O build atual usa Vinext com adaptador Cloudflare; a publicação na Vercel exige um adaptador compatível, como Nitro, e verificação do build. O proxy de `frontend/vite.config.ts` funciona apenas no desenvolvimento local.
4. Quando a Vercel emitir a URL, adicione `DJANGO_CSRF_TRUSTED_ORIGINS=https://<nome-do-site>.vercel.app` às variáveis de ambiente da API no Render e faça redeploy. Configure o frontend publicado para encaminhar `/api/*` à mesma rota na API do Render. Isso mantém os cookies de sessão e CSRF no mesmo domínio visto pelo navegador.
5. Teste login, criação de demanda, Chats e logout pela URL da Vercel. Para domínio próprio ou URL de preview, registre cada origem HTTPS adicional em `DJANGO_CSRF_TRUSTED_ORIGINS` e cada hostname real da API em `DJANGO_ALLOWED_HOSTS`.

O plano gratuito do Render serve para demonstração: o banco gratuito expira após 30 dias e o sistema de arquivos do serviço web é efêmero. Os anexos de demandas precisam de armazenamento persistente antes de qualquer uso real. Não carregue dados institucionais na demonstração.
