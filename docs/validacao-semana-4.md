# Validação técnica — agenda e calendário

Data: 06/09/2026. Ambiente local Windows 64 bits, Python 3.12.14,
Node.js 24.19.0, Django 5.2.17, PostgreSQL 17.11 e Microsoft Edge.

## Resultado

- **27 testes Django aprovados:** modelo temporal, intervalo semiaberto,
  timezone, sessão, perfis, equipes e regressão das demandas.
- **21 testes Playwright aprovados:** agenda, calendário, sessão, demandas,
  navegação, responsividade e acessibilidade.
- Oxlint, TypeScript e build de produção aprovados.
- Axe sem violações nas regras WCAG A/AA selecionadas na agenda móvel.
- Página sem rolagem horizontal em 390 px.

## Fluxo integrado

Frontend e Django foram executados com o proxy `/api`, cookie de sessão e
PostgreSQL local. Para o intervalo de 21/09/2026 a 28/09/2026:

| Perfil | Resultado autorizado |
| --- | ---: |
| Gestor da equipe 1 | 5 compromissos |
| Inspetor da equipe 1 | 4 compromissos |

A resposta informou `timezone: America/Fortaleza`; o primeiro compromisso foi
“Reunião de alinhamento”, às 09:00 locais. A diferença entre os perfis confirma
que o gestor recebe a agenda da equipe e o inspetor somente os eventos em que
participa.

## Comportamentos verificados

- Visões Dia, Semana e Mês preservam a data de referência.
- Anterior e Próximo avançam uma unidade da visão ativa.
- Hoje retorna ao período local atual e fica desabilitado quando ele já está visível.
- Cada mudança cancela a requisição anterior e consulta somente o novo intervalo.
- Eventos que atravessam o limite entram por sobreposição; eventos que apenas
  terminam no início ou começam no fim ficam fora.
- Limites sem offset, invertidos ou acima de 42 dias são rejeitados.
- A API usa duas consultas constantes para compromissos e participantes.
- Loader, lista vazia, erro com nova tentativa e sessão expirada são tratados.

## Limitações

- A agenda atual é somente leitura.
- Criação, edição, cancelamento, recorrência e conflitos de horário ficam para
  entregas posteriores.
- O calendário mensal resume até três compromissos por dia.
- A revisão visual e das regras com a equipe ainda precisa ser registrada.
- A hospedagem estática atual não executa o Django; a integração foi validada
  localmente.
