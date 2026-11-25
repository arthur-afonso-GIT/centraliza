# Sprint 01 — registro de entregas

Este registro reúne as **22 histórias de usuário** indicadas na seção Sprint 01 do [README](../README.md) e organizadas na lista **Sprint 01 — Entregas** do [Trello do Centraliza](https://trello.com/b/0qDLqz1F/centraliza). Os cartões dessa lista são referências às histórias originais, que foram preservadas no backlog. Uma HU pode reaparecer em outra sprint quando seu escopo é retomado ou aprofundado.

| História | Entrega registrada | Card da Sprint 01 |
| --- | --- | --- |
| HU 1 | Criação de demandas | [Cartão da Sprint 01](https://trello.com/c/7McfPQSI) |
| HU 2 | Atribuição a inspetores | [Cartão da Sprint 01](https://trello.com/c/7CNBNUWT) |
| HU 21 | Reatribuição de demanda | [Cartão da Sprint 01](https://trello.com/c/XBqP9GM1) |
| HU 3 | Definição de prazo | [Cartão da Sprint 01](https://trello.com/c/U8atozhy) |
| HU 4 | Definição de prioridade | [Cartão da Sprint 01](https://trello.com/c/JGrfJQRB) |
| HU 5 | Demandas pendentes | [Cartão da Sprint 01](https://trello.com/c/30DIGPOH) |
| HU 6 | Detalhes da demanda | [Cartão da Sprint 01](https://trello.com/c/3PCYQo7D) |
| HU 15 | Demandas da equipe | [Cartão da Sprint 01](https://trello.com/c/JRepLt5g) |
| HU 16 | Demandas atrasadas | [Cartão da Sprint 01](https://trello.com/c/ABhn8Snx) |
| HU 7 | Aceite da demanda | [Cartão da Sprint 01](https://trello.com/c/A3SCLTWx) |
| HU 8 | Início da execução | [Cartão da Sprint 01](https://trello.com/c/UwwdRAEf) |
| HU 9 | Alteração de status | [Cartão da Sprint 01](https://trello.com/c/B0CuYc4e) |
| HU 10 | Anexar evidências | [Cartão da Sprint 01](https://trello.com/c/jac4QKVE) |
| HU 19 | Observações | [Cartão da Sprint 01](https://trello.com/c/7Q2GKGgh) |
| HU 20 | Histórico da demanda | [Cartão da Sprint 01](https://trello.com/c/P5XAg0Ql) |
| HU 12 | Envio para avaliação | [Cartão da Sprint 01](https://trello.com/c/tQ68pWjx) |
| HU 13 | Aprovação | [Cartão da Sprint 01](https://trello.com/c/t3QZaPsU) |
| HU 14 | Correções | [Cartão da Sprint 01](https://trello.com/c/5uCeaCwk) |
| HU 23 | Agenda da equipe | [Cartão da Sprint 01](https://trello.com/c/Ee60ggBY) |
| HU 24 | Compromissos de campo | [Cartão da Sprint 01](https://trello.com/c/NMM7Fthj) |
| HU 25 | Reuniões no calendário | [Cartão da Sprint 01](https://trello.com/c/zS9MQeJh) |
| HU 30 | Leitura de avisos | [Cartão da Sprint 01](https://trello.com/c/iYo4UpLH) |

## Implementação no repositório

- As funcionalidades de demandas contemplam criação, atribuição, reatribuição, prazo, prioridade, visualização, execução, acompanhamento, anexos, observações e avaliação. Seus contratos e implementações estão concentrados em `backend/demandas/` e na interface em `frontend/components/`.
- A agenda da equipe e os compromissos estão distribuídos entre os módulos de Agenda no backend e no frontend.
- A leitura de avisos integra a área de Avisos, com regras de acesso definidas na API Django.
- Para critérios e evolução técnica, consulte [contrato-demandas.md](contrato-demandas.md), [plano-mvp-operacional.md](plano-mvp-operacional.md) e o [README](../README.md).
- A lista de cartões referencia o registro da sprint; não representa, por si só, execução adicional de testes.

## Validação restante

Os cartões de acompanhamento registram as histórias classificadas como entregues no README. A listagem não equivale à comprovação de teste de ponta a ponta em produção. Para aceitação, é necessário confrontar os critérios de cada HU com a versão efetivamente implantada, executar os testes pertinentes de backend e navegador e registrar evidências de uso nos perfis autorizados.

O roteiro integrado disponível é [`scripts/smoke-integrado.ps1`](../scripts/smoke-integrado.ps1), que exercita frontend, Django e PostgreSQL sem simulação da API. **Este registro documental não corresponde a uma nova execução desse roteiro.**
