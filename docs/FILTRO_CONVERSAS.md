# Chats e filtros de conversas

A página **Chats** permite criar uma conversa com integrantes ativos da equipe,
trocar mensagens e filtrar a lista por palavra-chave, data e participante.
Os filtros podem ser combinados e ignoram diferenças de acentos e maiúsculas.

## Acesso e API

- `GET /api/conversas/`: lista somente conversas da equipe ativa das quais o usuário participa, incluindo mensagens para a pesquisa local.
- `GET /api/conversas/membros/`: lista integrantes ativos da equipe que podem ser convidados.
- `POST /api/conversas/`: cria conversa com `titulo` e `participante_ids`; o criador entra automaticamente.
- `GET /api/conversas/{id}/`: lê uma conversa autorizada.
- `POST /api/conversas/{id}/mensagens/`: envia `texto` para uma conversa autorizada.

O backend verifica equipe ativa e participação em cada leitura e envio. Integrantes
de outras equipes, usuários sem participação e contas inativas não recebem o
conteúdo. A interface atualiza a lista a cada 15 segundos e após cada envio.

## Filtros

- Palavra-chave: título, nomes dos participantes e mensagens.
- Data inicial e final inclusivas no fuso de Fortaleza: criação da conversa ou mensagem no período.
- Participante: identificação numérica.
- Combinações usam lógica **E**; datas invertidas exibem erro.

Esta primeira versão carrega as mensagens autorizadas para pesquisa local. Para
equipes com histórico grande, a busca deverá migrar para uma API paginada.

## Verificação

Execute `node --experimental-strip-types --test frontend/unit-tests/conversas-filtros.test.ts`
na raiz do repositório para testar a lógica dos filtros. Os testes da API estão
em `backend/chats/tests.py` e o fluxo da tela em `frontend/tests/conversas.spec.ts`.
