# HU-17 — Destacar demandas críticas

Criticidade e prioridade são classificações independentes. Uma demanda pode
ser crítica com prioridade baixa ou média, ou ter prioridade alta sem ser crítica.

## Listagem e detalhe

- “Críticas” consulta `GET /api/demandas/?critica=true`.
- “Prioridade alta” consulta `GET /api/demandas/?prioridade=alta`.
- Cada segmento preserva os filtros atuais, paginação e ordenação por prazo e ID.
- Lista e detalhe exibem “Crítica” e “Alta prioridade” de forma independente.
- Cartões críticos recebem uma faixa superior discreta, compatível com a borda de atraso.

## Indicadores da Home

`GET /api/home/resumo/` retorna em `indicadores`:

| Campo | Regra |
| --- | --- |
| `criticas` | Total de demandas ativas autorizadas com `critica=true` |
| `alta_prioridade` | Total de demandas ativas autorizadas com `prioridade=alta` |

Ambos estão disponíveis para gestor e inspetor. O escopo é o mesmo da listagem:
equipes participantes conforme a equipe ativa e, para inspetores, somente suas
demandas atribuídas. Concluídas e canceladas não contam nesses indicadores.
Uma demanda com ambas as classificações conta uma vez em cada indicador.

Os cartões da Home exibem inclusive contagens zero e abrem o segmento
correspondente. O quinto indicador usa cinco colunas em telas largas e duas
colunas com o último cartão ocupando a linha em telas de até 1100px.

## Validação

Backend: `uv run python manage.py test demandas.tests.ListagemDemandasTest demandas.test_dashboard --noinput`.

Frontend: `npx playwright test tests/home.spec.ts tests/criticidade-demandas.spec.ts tests/demandas.spec.ts`.
Os testes de interface usam API simulada; a autorização e as contagens são
verificadas nos testes do backend. Não há migração de banco nesta HU.
