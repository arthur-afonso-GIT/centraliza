# CHAT-02 — Receber mensagens novas com estado claro

Responsável: Cecília. Prioridade P0. Fonte: backlog do chat de 23/11/2026.

## Comportamento implementado

- A lista de conversas e os membros são carregados ao entrar na tela. Ao abrir uma conversa, o frontend consulta imediatamente seu detalhe e agenda a próxima consulta 15 segundos após o término da anterior. A lista é atualizada separadamente, 30 segundos após a consulta anterior, para descobrir conversas criadas por outras pessoas.
- Atualização manual e automática compartilham a mesma proteção contra chamadas sobrepostas. Trocar a conversa ou sair cancela a leitura anterior; respostas antigas não substituem a conversa atual. Consultas de detalhe e envios têm timeout de 15 segundos.
- A interface informa atualização em andamento, sucesso e falha recuperável. O erro tem botão para tentar atualizar novamente; a atualização automática também continua após falhas.
- O envio mostra “Enviando mensagem…”, bloqueia cliques repetidos e só limpa o texto após confirmação. Em falha, mostra o erro e permite tentar enviar novamente. Rascunhos e tentativas ficam associados à conversa durante a permanência na tela.
- Cada tentativa lógica de envio usa um UUID (`client_id`). Repetir o mesmo UUID, autor e conversa retorna a mensagem já persistida. A API valida permissões antes de consultar a chave. Reutilizar a chave com outro texto retorna 409. Novos envios intencionais, mesmo com texto igual, recebem outra chave.
- A restrição única no banco e o bloqueio transacional da conversa protegem contra concorrência. A consulta autorizada usa a unicidade do par conversa/participante para bloquear apenas a conversa com `FOR UPDATE`, sem precisar de `DISTINCT`.
- Um GET iniciado antes de um envio confirmado não remove a mensagem da interface. Mensagens são reconciliadas pelo ID e ordenadas por data/ID.
- No fim do histórico, a rolagem acompanha mensagens novas. Ao ler conteúdo antigo, mantém a posição e oferece “Ver novas mensagens”.

## Migração

Antes de disponibilizar o frontend atualizado, executar no backend:

```sh
uv run python manage.py migrate
```

A migração `chats/0002_mensagemconversa_client_id_and_more.py` adiciona um UUID opcional e a restrição única. Mensagens anteriores e clientes sem `client_id` continuam funcionando; a proteção de reenvio depende do uso dessa chave.

## Validação realizada em 25/11/2026

- **8 testes Django passaram com PostgreSQL real (19.0)**: troca de mensagens, autorização, vínculo revogado, entradas inválidas e idempotência.
- **6 testes Playwright passaram em Chromium**: atualização automática em 15 segundos; falha/recuperação; exclusão de chamadas simultâneas; troca de conversa; resposta de envio perdida; rascunhos separados; GET atrasado; criação/filtro existente; rolagem em viewport móvel de 390 × 844.
- **1 smoke integrado passou com duas sessões, API Django e PostgreSQL reais**: B envia e A recebe automaticamente; a API salva o POST de A, mas a resposta é interrompida; A tenta novamente; após recarregar, há exatamente uma cópia persistida.
- `npm run typecheck`, lint dos arquivos TypeScript alterados, `git diff --check` e verificação de migrações passaram.

Comandos de reprodução (usando os navegadores configurados no projeto):

```sh
cd backend
uv sync --frozen
uv run python manage.py test chats --noinput
uv run python manage.py makemigrations --check --dry-run

cd ../frontend
npm ci
npm run typecheck
npx playwright test tests/conversas.spec.ts tests/chat-02.spec.ts
```

O smoke integrado está em `frontend/tests-integrated/chat-02.spec.ts`. Com frontend/API/banco em execução, fornecer por variáveis de ambiente `CENTRALIZA_CHAT_USER_A`, `CENTRALIZA_CHAT_USER_B` e `CENTRALIZA_CHAT_PASSWORD`, correspondentes a duas contas dedicadas da mesma equipe. O teste cria uma conversa e mensagens no ambiente escolhido. Executar:

```sh
npx playwright test --config playwright.smoke.config.ts chat-02.spec.ts
```

`CENTRALIZA_SMOKE_URL` seleciona a URL e `CENTRALIZA_PLAYWRIGHT_CHANNEL` seleciona o navegador. Sem as credenciais, esse smoke é explicitamente ignorado. Nenhuma credencial foi incluída nesta entrega.

## Limites e revisão

Os testes integrados foram locais, não na URL de produção. A revisão de outro integrante e o screencast de produção previstos no checklist do backlog ficam pendentes para a integração da branch. Rascunhos ficam em memória, não sobrevivem ao recarregamento da página. Indicadores de não lidas, notificações fora da tela e paginação pertencem às histórias CHAT-03, CHAT-06 e CHAT-04. A consulta periódica da lista usa o endpoint existente, que inclui os históricos.
