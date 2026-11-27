# CHAT-04 — Histórico paginado e busca na API

Responsável da história: Victor Bacelar. Prioridade P1, Épico 8.

## Contrato

As consultas aplicam primeiro a equipe ativa e a participação do usuário. Filtros
não concedem acesso. Acesso por ID a conversa não autorizada retorna 404; vínculo
revogado retorna 403. Envio com `client_id` e proteção contra duplicatas do CHAT-02
permanecem iguais.

- `GET /api/conversas/`: retorna resumos, participantes e `ultima_mensagem` (texto),
  sem incluir o histórico completo de cada conversa.
- `GET /api/conversas/{id}/`: resumo mais a primeira página de `mensagens`.
- `GET /api/conversas/{id}/mensagens/`: página de mensagens em `resultados`.
- Listas retornam `{ resultados: [...], proximo_cursor: string | null }`.
  O detalhe usa `mensagens` no lugar de `resultados` e também tem `proximo_cursor`.

Parâmetros opcionais:

| Parâmetro | Regra |
| --- | --- |
| `limite` | Padrão 30, mínimo 1, máximo 100; fora da faixa retorna 400. |
| `cursor` | Cursor opaco da resposta anterior, válido por 24 h. |
| `palavra` | Até 200 caracteres; pesquisa substring sem acentos/maiúsculas. |
| `inicio`, `fim` | Datas ISO YYYY-MM-DD, inclusivas no fuso America/Fortaleza. |
| `participante` | ID de participante da conversa; nas mensagens filtra o autor. |
| `apos` | Nas mensagens, retorna IDs maiores que o informado para atualização incremental. |

Em conversas, palavra pesquisa título, nomes/usuários dos participantes e texto de
qualquer mensagem, inclusive páginas antigas. O período considera criação da conversa
OU existência de mensagem no período. Os filtros combinam com E, mantendo a semântica
anterior: palavra e período podem ser satisfeitos por mensagens diferentes.
Nas mensagens, os filtros se aplicam à própria mensagem.

O fim do período é convertido para o início do dia seguinte, exclusivo; não se usa
23:59:59 que perderia microssegundos. Data inválida, período invertido ou cursor
inválido produzem 400. Os valores são parametrizados pelo ORM.

A lista de conversas usa **criação decrescente e ID decrescente**, não última atividade.
Isso evita que um novo envio mova a conversa para uma página já visitada. Mensagens
antigas também são buscadas por criação/ID decrescentes, mas cada página é exibida em
ordem cronológica. Com `apos`, a leitura é crescente e o cliente consome todas as páginas
pendentes, preservando o mesmo `apos` até o fim da consulta.

Os cursores são assinados e vinculados a usuário, equipe, recurso, direção, limite e
filtros. Reutilize os mesmos parâmetros e acrescente `cursor`. Não há contagem total
nem paginação por OFFSET. A consulta busca apenas limite + 1 registros.
Atualizações de permissões e filtros são reavaliadas em cada página; não é um snapshot
transacional de toda a busca. Para incluir novas conversas ou novas correspondências
após mudanças concorrentes, reinicie a busca.

## Interface

- Filtros de palavra, data e participante passam para a API, com debounce de 300 ms
  para palavra. Respostas antigas são canceladas/descartadas.
- “Carregar mais conversas” percorre as páginas. A quantidade mostrada é carregada,
  não um total de toda a equipe.
- “Carregar mensagens anteriores” preserva a posição de leitura.
- “Buscar no histórico” pesquisa texto de mensagens no servidor, inclusive antigo.
  Limpe e envie a busca para voltar à atualização automática.
- A conversa aberta fica independente da página/lista filtrada.
- Atualização automática de mensagens segue em 15 s. A lista atualiza em 30 s na
  primeira página. Após expandir a lista, “Atualizar lista” reinicia a paginação
  explicitamente, sem apagar páginas antigas durante a leitura.
- Durante busca no histórico, resultados ficam estáveis até busca/atualização manual.
- Rascunhos por conversa, UUID de reenvio, recuperação e reconciliação por ID preservados.

## Banco e implantação

Aplicar a migração antes de disponibilizar o novo backend/frontend juntos:

```powershell
cd backend
uv run python manage.py migrate
```

`chats/0003_busca_paginada.py` habilita `pg_trgm`, cria a função imutável de
normalização Unicode NFD, índices GIN de título/texto e um índice composto de equipe,
criação e ID. Reutiliza o índice de conversa/criação/ID das mensagens.
O usuário de migração precisa poder instalar a extensão `pg_trgm`; caso o ambiente
não permita, o administrador deve provisioná-la antes. A criação dos índices pode
bloquear escrita em tabelas grandes: programe uma janela de implantação.

A normalização remove marcas U+0300–U+036F e converte para minúsculas, mantendo busca
por substring. Termos muito curtos e nomes de participantes podem exigir varredura;
os índices não garantem latência constante para qualquer tamanho de base.
Os índices funcionais são gerenciados por RunSQL na migração (não por campos extras
que poderiam ficar desatualizados em bulk_update).

## Reprodução da validação

```powershell
cd backend
uv run python manage.py test chats --noinput
uv run python manage.py makemigrations --check --dry-run
cd ../frontend
npm run typecheck
npx playwright test tests/conversas.spec.ts tests/chat-02.spec.ts tests/chat-04.spec.ts
```

Os novos testes da API cobrem 135 conversas e 1.205 mensagens, empates de data,
limites, acentos Unicode, período de Fortaleza, autorização por filtro/ID/cursor,
quantidade limitada de consultas e índices instalados. Os testes de navegador usam
API simulada e verificam paginação, falha/retentativa, busca remota, rolagem e leitura
de mais de uma página de mensagens novas. Resultados reais são registrados ao final.

## Resultado observado em 27/11/2026

Implementação local na branch `feature/chat-04-historico-paginado`; ainda pendente
 de validação integrada, sem commit ou publicação desta entrega.

- `node node_modules/vinext/dist/cli.js build`: compilação concluída; aviso do
  vinext sobre classificação estática de algumas rotas.
- `node node_modules/typescript/bin/tsc --noEmit`: passou.
- `node --experimental-strip-types --test unit-tests/conversas-filtros.test.ts`:
  1 teste aprovado.
- Lint direcionado aos arquivos alterados: passou.
- `python manage.py check`: nenhuma ocorrência.
- `python manage.py makemigrations --check --dry-run`: nenhuma alteração de modelo
  pendente; conferência do histórico aplicado no banco não ocorreu, por timeout.
- `python manage.py test chats --noinput --keepdb`: 18 casos descobertos, mas a
  execução parou na conexão com PostgreSQL (primeiro permissão de socket, depois
  timeout). Nenhum caso dessa tentativa deve ser considerado aprovado.
- Playwright para `conversas.spec.ts`, `chat-02.spec.ts` e `chat-04.spec.ts`:
  bloqueado na inicialização/acesso ao servidor local; não houve validação visual.
- `git diff --check`: passou.
- `graphify` não disponível no PATH; grafo de código não atualizado.

Antes de integrar, aplicar a migração em PostgreSQL de desenvolvimento, executar
os 18 testes do chat e os testes de navegador acima. Não foi medida latência em
produção nem aprovada a experiência visual nesta sessão. O teste de volume está
escrito, mas depende dessa execução para confirmar seus resultados.

## Integração local com CHAT-03 e CHAT-06

Conflitos com `origin/main` em `e3be6d4` resolvidos preservando notificações,
leitura persistida e paginação. A migração `0004_integrar_busca_leitura` reúne os
ramos de migração. As contagens de não lidas são calculadas no banco, sem carregar
o histórico inteiro. A confirmação de leitura retorna a contagem restante; a
interface não deduz o total apenas da página visível. Avisos podem abrir pelo ID
uma conversa autorizada que não aparece na primeira página da lista.

Validação após a resolução: build do frontend concluído, TypeScript aprovado,
`manage.py check` aprovado, dois testes unitários de leitura paginada aprovados,
consulta ORM de contagem compilada e `git diff --check` aprovado.
`makemigrations --check --dry-run` não encontrou alterações pendentes; a consulta
ao histórico do banco apresentou timeout. Testes integrados com PostgreSQL e
navegador continuam pendentes. Adicionado teste de 1.205 não lidas com página de
30 mensagens para execução no banco. Não houve commit, push ou merge remoto.
