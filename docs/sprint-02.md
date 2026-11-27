# Sprint 02 — registro de entregas

A Sprint 02 retomou **duas histórias** de planejamento de demandas: regras de prazo (HU 3) e de prioridade (HU 4). Os cartões estão reunidos na lista **Sprint 02 — Entregas** do [Trello do Centraliza](https://trello.com/b/0qDLqz1F/centraliza). Como as HUs também aparecem na Sprint 01, esta seção documenta seu refinamento e sua validação específica, sem contabilizá-las como histórias inéditas no produto.

| História | Entrega registrada | Card da Sprint 02 |
| --- | --- | --- |
| HU 3 | Conferência das permissões e do comportamento de alteração do prazo para gestor e inspetor | [Regras de prazo](https://trello.com/c/erYbOOBp) |
| HU 4 | Conferência das permissões e do comportamento de alteração da prioridade | [Regras de prioridade](https://trello.com/c/vRTkq5AX) |

## Implementação no repositório

- As regras de demanda e a autorização dos perfis ficam no domínio Django em `backend/demandas/`; a interface utiliza componentes de demandas em `frontend/components/`.
- O contrato documentado está em [contrato-demandas.md](contrato-demandas.md); o [plano de ação SR2](plano-acao-sr2.md) registra as questões de papéis, critérios de aceite e integração.
- A documentação de pair programming das Sprints 02 e 03 está em [relatorio-pair-programming-sprints-02-03.png](relatorio-pair-programming-sprints-02-03.png). O [README](../README.md) também aponta para o relatório compartilhado da equipe.

## Validação restante

Os dois cartões de sprint estão marcados como concluídos no Trello, mas seus campos de planejamento mantêm critérios de aceite planejados. A comprovação final requer evidências de que gestor e inspetor somente consigam alterar prazo e prioridade conforme a autorização definida, inclusive com casos de acesso negado.

A regressão integrada pode ser executada com [`scripts/smoke-integrado.ps1`](../scripts/smoke-integrado.ps1), complementada por testes de backend e navegador específicos. **Não foi executado novo teste durante a elaboração deste documento.**
