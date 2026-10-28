# HU 16 — Acompanhar demandas atrasadas

O inspetor acessa a aba **Atrasadas** na lista de demandas ou o indicador de
entregas atrasadas na página inicial. Essa visão reúne todos os estados ativos,
em ordem de prazo (mais antigo primeiro), respeitando a paginação e a busca SEI.
Gestores também podem usar a aba, mantendo os filtros avançados existentes.

Uma demanda está atrasada quando seu prazo é estritamente anterior ao instante
da consulta e ela não está concluída nem cancelada. O filtro usa o endpoint já
existente `GET /api/demandas/?atrasada=true`, sem restringir o status a pendente.
As regras existentes de equipe participante e responsável continuam aplicadas:
o inspetor vê apenas as demandas atribuídas a ele na equipe ativa.

A lista mostra uma borda destacada, ícone, texto "Atrasada", prazo original e
tempo decorrido (minutos, horas ou dias). O detalhe também mostra o atraso e
remove o aviso quando uma alteração de prazo retorna a demanda regularizada.
O tempo exibido usa o relógio do navegador, considera o deslocamento de fuso do
prazo e é atualizado a cada minuto. O status de atraso vem da API na consulta;
reabra/atualize a lista para consultar novos vencimentos. Prazos sem horário
mantêm a compatibilidade com o fim do dia institucional (UTC−3).

A implementação não modifica dados nem adiciona migrações. As alterações ficam
na branch `feature/hu-16-demandas-atrasadas`, para revisão antes de integrar a main.

## Como validar

- Backend: `python manage.py test demandas.test_atrasadas demandas.test_prazos demandas.tests.ListagemDemandasTest`.
- Interface: `npx playwright test tests/atrasadas.spec.ts tests/demandas.spec.ts tests/detalhe-demanda.spec.ts tests/prazo-demanda.spec.ts`.
- Qualidade e build: `npm run typecheck`, `npm run lint` e `npm run build`.

As regressões cobrem estados ativos/encerrados, limites de horário e fuso,
isolamento entre responsáveis/equipes, ordenação, paginação, busca, prorrogação,
erro com nova tentativa, estado vazio e acessibilidade em tela móvel.

## Validação em 28/10/2026

- 42 testes backend executados em SQLite temporário: 41 aprovados e um teste
  de concorrência ignorado por exigir suporte real a `select_for_update`.
- 21 testes de interface aprovados no Edge, com API simulada, incluindo cinco
  cenários da HU 16 e regressões de lista, detalhe e alteração de prazo.
- Verificação visual em 390 px e análise automatizada de acessibilidade aprovadas.
- Após o ajuste visual final, os oito cenários de HU 16 e listagem passaram novamente.
- TypeScript, Oxlint e build de produção aprovados na versão final.
- PostgreSQL não foi validado nesta execução.
