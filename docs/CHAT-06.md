# CHAT-06 — Receber avisos de novas mensagens

Responsável: Lívia. Prioridade P1. Fonte: backlog do chat de 23/11/2026.

Notificar novas mensagens dentro do Centraliza, sem alerta para o próprio
autor nem exposição indevida.

## Dependência

Esta história usa o controle de leitura do **CHAT-03** (`LeituraConversa` e
`POST /api/conversas/{id}/leitura/`). A branch `feature/chat-06-notificacoes`
parte de `feature/chat-03-mensagens-nao-lidas` e incorpora a `main` com o
CHAT-01 e o CHAT-02. Por isso o PR do CHAT-06 deve ser integrado **depois** do
CHAT-03.

A junção com a `main` criou a migração `chats/0003_juncao_leitura_envio.py`,
que une as duas migrações `0002` (CHAT-03 e CHAT-02) sem alterar o banco. Se o
CHAT-03 for integrado à `main` com outra junção, esta branch precisa ser
atualizada para manter uma única linha de migrações.

## Comportamento implementado

- **Contador no menu:** o item “Chats” mostra o total de mensagens não lidas
  em qualquer tela. No celular, o botão do menu mostra o mesmo número. Para
  leitores de tela, o link é anunciado como “Chats, 3 mensagens não lidas no
  chat”.
- **Aviso de nova mensagem:** fora da tela de Chats, uma mensagem nova gera um
  aviso no canto da tela com o autor e o título da conversa, por exemplo
  “Nova mensagem de Ana em ‘Vistoria na fábrica’”. Quando a conversa tem mais
  de uma não lida, o aviso informa a quantidade. O link “Abrir conversa” leva a
  `/chats?conversa={id}`, que abre a conversa indicada. O aviso pode ser
  dispensado e fica no máximo com três conversas.
- **Sem exposição indevida:** o aviso e a API não trazem o texto das mensagens,
  porque a tela pode estar compartilhada ou projetada. Só entram conversas em
  que a pessoa participa, na equipe ativa e com vínculo ativo.
- **Sem alerta para o próprio autor:** mensagens enviadas pela própria pessoa
  não contam nem geram aviso, com a mesma regra das não lidas do CHAT-03.
- **Sem repetição:** ao entrar no sistema, as mensagens antigas aparecem só no
  contador. Cada mensagem gera no máximo um aviso por aba, mesmo trocando de
  tela, porque o último aviso fica no `sessionStorage`. Sem armazenamento
  disponível, o contador continua funcionando.
- **Na tela de Chats** não há aviso flutuante, porque a lista já mostra as não
  lidas. Ao registrar a leitura de uma conversa, o contador do menu é
  atualizado na hora.
- A consulta acontece ao abrir cada tela e a cada 30 segundos, apenas com a
  aba visível. Ao voltar para a aba, consulta imediatamente. Falhas mantêm o
  último contador, sem mensagem de erro.

## API

`GET /api/notificacoes/chat/` com sessão:

```json
{
  "total": 3,
  "conversas": [
    {
      "id": 7,
      "titulo": "Vistoria na fábrica",
      "nao_lidas": 2,
      "ultima_mensagem": { "id": 42, "autor_nome": "Ana", "criada_em": "2026-11-27T12:10:00Z" }
    }
  ]
}
```

- As conversas vêm da mensagem não lida mais recente para a mais antiga.
- `403` para conta sem equipe ou com vínculo inativo e `401` sem sessão,
  como nas demais rotas do chat.
- A consulta usa 3 queries, independente do número de mensagens. A rota fica
  fora de `/api/conversas/` para não se confundir com `/api/conversas/{id}/`.

Nenhuma migração nova foi criada para o CHAT-06.

## Validação realizada em 27/11/2026

- **217 testes Django passaram com PostgreSQL 16.** 6 são novos
  (`chats.test_notificacoes`): resumo sem texto, autor sem alerta, leitura
  zerando o aviso, conversas de terceiros e de outra equipe, vínculo inativo e
  sessão, e custo constante de consultas.
- **5 cenários Playwright novos passaram em Chromium**
  (`tests/chat-06-notificacoes.spec.ts`): contador sem aviso para mensagens
  antigas; aviso com autor e conversa, sem texto, abrindo a conversa e zerando
  o contador; sem repetição ao trocar de tela e aviso dispensável; ausência do
  aviso na tela de Chats; acessibilidade (axe) e largura em 390 × 844.
- Os cenários de conversas, CHAT-02 e CHAT-03 continuam passando. Suíte
  completa: 117 aprovados e 5 falhas que já ocorrem na `main` atual
  (`andamento-demanda.spec.ts`, `navigation.spec.ts:31` e
  `accessibility.spec.ts:62`).
- `npm run typecheck`, build de produção e `makemigrations --check` passaram.
  O lint dos arquivos alterados passou. O lint geral acusa dois erros já
  existentes, em `navigation-link.tsx` (main) e `use-conversa-leitura.ts`
  (CHAT-03).

```sh
cd backend
uv run python manage.py test chats

cd ../frontend
npx playwright test tests/chat-06-notificacoes.spec.ts
```

## Limites

- Os avisos funcionam enquanto o Centraliza está aberto. Notificações do
  navegador, push e e-mail ficaram fora do escopo.
- O aviso aparece em até 30 segundos após a mensagem.
- Não houve teste integrado com duas sessões reais nem no Edge.
