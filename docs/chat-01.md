# CHAT-01 — conversa entre duas pessoas

Responsável: Antônio Marcos. Prioridade P0, Épico 8. Fonte: backlog de 23/11/2026.

## 1. Planejamento

A base já possui conversas, mensagens, migração `chats/0001_initial` e interface.
O escopo desta entrega é viabilizar e comprovar a troca de mensagens persistida,
com sessão Django e CSRF, sem antecipar atualização/reenvio (CHAT-02), não lidas,
paginação, gestão de participantes ou notificações.

O diagnóstico com PostgreSQL real encontrou uma falha no POST de mensagens:
`FOR UPDATE` não pode ser usado com `DISTINCT`. A consulta filtra um único
participante, cujo par conversa/usuário já é único na tabela intermediária.
Remover `DISTINCT` preserva a autorização e permite bloquear somente a conversa
durante a transação.

Critérios verificados pelo smoke:

- A cria uma conversa incluindo somente B; A envia e B lê e responde.
- A e B veem as duas mensagens após recarregar e após sair e entrar novamente.
- C, integrante ativo da mesma equipe sem participação, não lista, lê ou escreve.
- D, integrante ativo de outra equipe, não lista, lê ou escreve.
- Sem sessão, a API retorna 401; com sessão e sem CSRF, os POSTs retornam 403.
- Tentativas indevidas não acrescentam mensagens ao histórico.

## 2. Desenvolvimento

- `backend/chats/views.py`: consulta autorizada compatível com o bloqueio no PostgreSQL.
- `backend/chats/tests.py`: regressão com dois clientes, login real e verificação de CSRF.
- `frontend/tests-integrated/chat.spec.ts`: dois contextos independentes de navegador;
  A/B permanecem conectados simultaneamente durante a troca. O segundo contexto
  é reutilizado, após logout, para C/D. Nenhuma rota é simulada.
- `scripts/smoke-integrado.ps1`: execução selecionável, descoberta do PostgreSQL
  instalado no Windows e interrupção se migrações ou cargas falharem. Isola
  `DATABASE_URL` para que o smoke use o banco local descartável; restaura as
  variáveis de ambiente ao encerrar.
- Os seletores dos testes existentes de chat e do smoke de demandas foram
  alinhados à interface atual. O smoke aceita até 15 segundos por expectativa
  e 90 segundos por teste para carregar os serviços reais; CHAT-01 reserva
  até 180 segundos para os vários logins.

Não há mudança de modelo nem nova migração. A migração existente precisa estar
aplicada em cada ambiente.

## 3. Testes

### Local, com PostgreSQL real

Com dependências instaladas e portas 3000/8000 livres, execute na raiz:

```powershell
.\scripts\smoke-integrado.ps1 -TestFile chat.spec.ts -DatabasePassword $env:CENTRALIZA_LOCAL_DB_PASSWORD
```

A senha acima é a do PostgreSQL local. O script recria somente o banco
`centraliza_smoke`, aplica migrações e prepara quatro contas fictícias ativas:
A=`demo.gestor.1`, B=`demo.inspetor.1`, C=`demo.inspetor2.1` e
D=`demo.inspetor.2`. A/B/C pertencem à equipe 1; D pertence à equipe 2.
`DemoPassword` permite escolher uma senha local para as contas recém-criadas.
Sem `-TestFile`, o script também executa o smoke existente de demandas.
As contas do smoke local vêm da carga fictícia. As credenciais `CENTRALIZA_CHAT_*`
são usadas apenas no chat remoto, e o smoke de demandas roda somente em localhost.

O relatório HTML fica em `frontend/playwright-report-smoke/index.html` e os
anexos em `frontend/test-results-smoke/`. O teste anexa capturas do histórico de
A/B após novo login e um JSON com ambiente, horário, ID da conversa e resultados
de autorização. Não grava traces, vídeos, senhas, cookies nem payloads de login.
Os diretórios de execução são ignorados pelo Git; revise qualquer evidência
antes de compartilhá-la, usando somente dados fictícios.

### Ambiente publicado

Esta etapa depende do administrador do Render e de contas fictícias autorizadas.
Não execute `seed_demo` em produção nem habilite DEBUG para criar contas.

1. O administrador aplica `uv run python manage.py migrate --noinput` e verifica
   `uv run python manage.py showmigrations chats`: `[X] 0001_initial`.
   O início do serviço descrito em `render.yaml` já executa `migrate`.
2. Pelo fluxo de administração de equipes, prepara A/B/C ativos com vínculo
   ativo na mesma equipe e D ativo em outra equipe. A/B devem ter nomes
   distinguíveis. Nenhuma conta deve participar previamente da nova conversa.
3. Confere o proxy `/api` no frontend e `DJANGO_CSRF_TRUSTED_ORIGINS` incluindo
   a origem HTTPS utilizada. Usa uma publicação que contenha esta correção.
4. Cria `frontend/.env.smoke.local`, ignorado pelo Git, com os valores abaixo.
   Substitui os marcadores localmente, sem publicar o arquivo:

```dotenv
CENTRALIZA_SMOKE_URL=https://centralizavisat.vercel.app
CENTRALIZA_CHAT_A_USERNAME=<usuario-a>
CENTRALIZA_CHAT_A_PASSWORD=<senha-a>
CENTRALIZA_CHAT_B_USERNAME=<usuario-b>
CENTRALIZA_CHAT_B_PASSWORD=<senha-b>
CENTRALIZA_CHAT_C_USERNAME=<usuario-c>
CENTRALIZA_CHAT_C_PASSWORD=<senha-c>
CENTRALIZA_CHAT_D_USERNAME=<usuario-d>
CENTRALIZA_CHAT_D_PASSWORD=<senha-d>
```

5. Em `frontend`, executa `npm run test:smoke:chat`. O teste exige credenciais
   explícitas para destinos remotos. Faz GET/POST pelo domínio do frontend,
   incluindo login, criação, envio, leitura e logout. Não aplica migrações nem
   recria bancos remotos. Cria uma conversa identificada por `CHAT-01 <timestamp>`
   com duas mensagens fictícias, que permanece para conferência.
6. Registra versão publicada, saída da migração, relatório e capturas revisadas.
   Remove as variáveis locais de credenciais quando não forem mais necessárias.

### Resultado desta entrega

Validação local em 26/11/2026, com Edge, Node 24 e PostgreSQL 16.15:

| Verificação | Resultado |
| --- | --- |
| `python manage.py check` | Sem problemas |
| `python manage.py makemigrations --check --dry-run` | Nenhuma alteração de modelo pendente |
| `python manage.py test` | 206 testes aprovados, incluindo os 7 de chats |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado |
| `npm test -- conversas.spec.ts` | 1 teste aprovado |
| Smoke CHAT-01 com API e banco reais | Aprovado: A/B, recarga, novo login, CSRF e bloqueio C/D |
| `scripts/smoke-integrado.ps1` completo | 2 testes aprovados: chat e fluxo de demanda |
| Oxlint nos arquivos TypeScript alterados | Aprovado |
| `npm run lint` geral | Falha preexistente em `components/navigation-link.tsx:5`, regra `jsx-a11y(anchor-has-content)` |

Evidências locais revisadas, com dados fictícios:

- [Histórico de A após novo login](evidencias/chat-01/historico-a.png).
- [Histórico de B após novo login](evidencias/chat-01/historico-b.png).
- [Resultado de autorização e persistência no navegador](evidencias/chat-01/aceite-local.json).
- [Conferência direta do PostgreSQL e migração aplicada](evidencias/chat-01/banco-local.json).

A aceitação publicada permanece pendente: o responsável por esta execução
informou não possuir acesso ao Render. O roteiro acima permite ao administrador
aplicar/verificar a migração, preparar as contas e repetir a aceitação pelo
frontend publicado. Os resultados locais não substituem essa comprovação.
