# HU — Concluir a execução de uma demanda

Como Inspetor, quero registrar a conclusão de uma demanda, para indicar que
finalizei as atividades necessárias.

## Decisão de fluxo

Concluir a execução **não** encerra a demanda: a avaliação do gestor
continua obrigatória, conforme a [matriz do fluxo operacional](fluxo-demandas.md).
Para o inspetor, registrar a conclusão é a transição Em andamento (ou Em
correção) → Aguardando avaliação, com resumo da entrega obrigatório. A demanda
só chega a Concluída quando o gestor aprova a entrega. Nenhuma regra nova de
transição foi criada.

## Comportamento

- No card “Status da demanda”, a opção aparece como “Execução concluída
  (enviar para avaliação)”, com o campo “Resumo da entrega” e uma nota
  explicando que a demanda seguirá para avaliação.
- Ao salvar, o sistema registra o evento no histórico (autor, data, horário e
  resumo) e mostra “Execução concluída. A demanda saiu das suas pendências e
  foi enviada para avaliação.”
- O detalhe passa a exibir o aviso “Execução concluída”, com a data do
  registro. Para o gestor, o aviso indica quem concluiu e convida à avaliação.
- **Pendências do inspetor:** no painel inicial (`GET /api/home/resumo/`),
  os indicadores e a lista “Demandas prioritárias” do inspetor deixam de contar
  demandas em Aguardando avaliação, porque elas não dependem mais dele. Para o
  gestor nada muda: a demanda continua nos indicadores, na lista e na carga do
  inspetor até ser avaliada.
- Se o gestor solicitar correções, a demanda volta às pendências do inspetor
  (Em correção) e ele registra a conclusão novamente.

Nenhuma migração é necessária.

Testes: `python manage.py test demandas.test_concluir_execucao` e
`npx playwright test tests/concluir-execucao.spec.ts`.

## Validação desta implementação — 03/11/2026

- Backend: 144 testes em SQLite temporário; 143 aprovados e um teste de
  concorrência ignorado. 5 testes novos cobrem o evento com resumo e autor,
  o resumo obrigatório, a recusa de Concluída direta pelo inspetor, a saída das
  pendências do inspetor e a permanência para o gestor.
- Interface: 3 cenários Playwright novos (conclusão com resumo, visão do
  gestor, acessibilidade em 390px). Suíte completa: 77 cenários aprovados no
  Edge.
- TypeScript, Oxlint e build de produção aprovados.
- PostgreSQL não foi validado nesta execução.
