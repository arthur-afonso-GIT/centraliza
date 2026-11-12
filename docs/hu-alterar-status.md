# HU — Alterar o status de uma demanda

Como Inspetor, quero alterar o status de uma demanda, para manter sua situação
atualizada.

O inspetor responsável altera o status no card “Status da demanda” do detalhe.
O card mostra a situação atual e o seletor “Novo status”, que lista apenas as
opções disponíveis para ele naquela etapa. Quando a transição exige texto,
o campo “Resumo da entrega” aparece e o botão “Salvar status” só é liberado
com o resumo preenchido. Ao salvar, o selo do cabeçalho, as etapas, o card e o
histórico mostram a nova situação imediatamente, sem recarregar a página.

As opções seguem a [matriz do fluxo operacional](fluxo-demandas.md), sem
novas regras: Pendente → Aceita, Aceita → Em andamento e Em andamento ou Em
correção → Aguardando avaliação, com resumo obrigatório. Em Aguardando
avaliação, Concluída e Cancelada o inspetor não tem opções e o card não aparece.
Gestores continuam usando as ações de avaliação e cancelamento.

O card substitui os botões sequenciais “Aceitar demanda”, “Iniciar demanda” e
“Enviar/Reenviar para avaliação” e o campo de resumo avulso.

## API

`GET /api/demandas/{id}/` e as respostas das ações sobre a demanda passam a
incluir `status_disponiveis`, uma lista de `{ "status", "exige_texto" }`
calculada para o usuário da sessão. Inspetores que não são o responsável
recebem lista vazia. A alteração continua em
`PATCH /api/demandas/{id}/status/`: a API revalida a transição, bloqueia a
demanda e registra o evento na mesma transação. Opções fora da lista retornam
400 ou 403 sem alterar a demanda. Nenhuma migração é necessária.

Testes: `python manage.py test demandas.test_status` e
`npx playwright test tests/alterar-status.spec.ts`.

## Validação desta implementação — 28/10/2026

- Backend: 139 testes executados em SQLite temporário; 138 aprovados e um
  teste de concorrência ignorado por exigir `select_for_update` real.
  4 testes novos cobrem as opções por etapa e perfil, a resposta com a nova
  situação e a recusa de opções indisponíveis.
- Interface: 5 cenários novos no Edge (alteração imediata, resumo obrigatório,
  erro da API, gestor sem o seletor, acessibilidade em 390px). Os cenários de
  aceite, avaliação e detalhe foram atualizados para o seletor. Suíte completa:
  74 cenários Playwright aprovados no Edge.
- TypeScript, Oxlint e build de produção aprovados.
- PostgreSQL e concorrência entre conexões não foram validados nesta execução.
