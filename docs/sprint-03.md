# Sprint 03 — registro de entregas

Este registro reúne as seis entregas de demandas já marcadas como concluídas no
[quadro Centraliza](https://trello.com/b/0qDLqz1F/centraliza). A lista **Sprint 03 — Entregas** foi criada para reunir os cards de entrega; cada card aponta para o item original no cronograma SR2. O estado das histórias na lista geral do Trello pode diferir do estado dos cards de entrega.

| História | Entrega | Card da Sprint 03 |
| --- | --- | --- |
| HU 16 | Atraso visível na lista e no detalhe, calculado pelo prazo | [Atraso da demanda](https://trello.com/c/fjuD7c9Q) |
| HU 17 | Destaque e filtro de demandas críticas | [Demandas críticas](https://trello.com/c/IUy9FWbR) |
| HU 9 | Transições de status autorizadas para gestor e inspetor | [Mudança de status](https://trello.com/c/D8OCorO8) |
| HU 11 | Fim da execução pelo inspetor separado da aprovação do gestor | [Conclusão da execução](https://trello.com/c/HIttNRF5) |
| HU 18 | Registro de atividades, pendências, autor e data no histórico | [Andamento](https://trello.com/c/kiuXlM7u) |
| HU 22 | Consulta somente leitura ao retrato da demanda anterior à reatribuição | [Demanda anterior](https://trello.com/c/ryZepfjF) |

## Implementação no repositório

- O backend concentra as regras de transição, prazo, prioridade, histórico e permissões em `backend/demandas/`.
- A interface apresenta segmentos de demandas, detalhe, indicação de atraso e criticidade, andamento e consultas anteriores em `frontend/components/`.
- Os contratos e as regras de cada fluxo estão em [contrato-demandas.md](contrato-demandas.md), [fluxo-demandas.md](fluxo-demandas.md), [hu-alterar-status.md](hu-alterar-status.md), [hu-concluir-execucao.md](hu-concluir-execucao.md) e [hu-16-demandas-atrasadas.md](hu-16-demandas-atrasadas.md).
- O relatório de pair programming das Sprints 02 e 03 está em [relatorio-pair-programming-sprints-02-03.png](relatorio-pair-programming-sprints-02-03.png).

## Validação restante

Os cards concluídos registram a entrega de cada história. A aceitação integrada
com gestores e inspetores da VISAT, em ambiente e dados autorizados, ainda precisa
ser feita. O roteiro técnico de ponta a ponta está em
[`scripts/smoke-integrado.ps1`](../scripts/smoke-integrado.ps1); sua execução não
foi repetida durante esta atualização documental.

O módulo de Chats mesclado no PR [#12](https://github.com/arthur-afonso-GIT/centraliza/pull/12) é uma entrega posterior a este recorte da Sprint 03. Seu contrato e limites estão em [FILTRO_CONVERSAS.md](FILTRO_CONVERSAS.md).
