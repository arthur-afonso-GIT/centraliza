# Plano de execução — agenda e calendário

Período: **21/09 a 27/09**. Meta: substituir a página provisória de Agenda por
um calendário integrado, com visualizações de dia, semana e mês, navegação entre
períodos e compromissos autorizados fornecidos pela API no fuso de Fortaleza.

## Ponto de partida

O Centraliza já possui sessão Django, perfis, equipes, PostgreSQL, layout
responsivo e estados padronizados de carregamento e erro. O backend já usa
`USE_TZ=True` e `TIME_ZONE="America/Fortaleza"`; a agenda deve preservar essa
configuração, armazenando instantes em UTC e apresentando horários locais.

## Metas e tarefas

| ID | Tarefa | Frente | Depende de | Entrega verificável |
| --- | --- | --- | --- | --- |
| S4-01 | Definir contrato, acesso e comportamento temporal | Produto + design + back-end | — | Intervalos, timezone, visibilidade e estados documentados |
| S4-02 | Prototipar dia, semana e mês | Design | S4-01 | Desktop e celular com controles anterior, próximo, Hoje e seletor de visão |
| S4-03 | Modelar compromissos e preparar dados | Back-end | S4-01 | Migração e carga fictícia com eventos dentro e fora dos intervalos |
| S4-04 | Implementar endpoint por intervalo | Back-end | S4-03 | Consulta autorizada, ordenada e normalizada para `America/Fortaleza` |
| S4-05 | Construir calendário React | Front-end | S4-02 | Componente visual das três visões com estados de carregamento, vazio e erro |
| S4-06 | Integrar navegação temporal | Front-end + back-end | S4-04 e S4-05 | Cada mudança de período consulta apenas o intervalo visível; Hoje reposiciona a agenda |
| S4-07 | Validar e documentar | QA + equipe | S4-06 | Testes de limites, timezone, responsividade, teclado, build e Graphify |

Situação técnica: S4-03 concluída com módulo de agenda, modelo, migração e carga
fictícia idempotente. S4-04 concluída com intervalo semiaberto, acesso por perfil
e resposta em Fortaleza. As regras e o protótipo ainda aguardam revisão da
equipe; o calendário permanece nas próximas tarefas.

## Cronograma diário

| Data | Prioridade | Resultado esperado |
| --- | --- | --- |
| Seg. 21/09 | S4-01 | Fechar regras de intervalo, acesso, timezone e interação |
| Ter. 22/09 | S4-02 e S4-03 | Protótipo revisável, modelo, migração e massa fictícia |
| Qua. 23/09 | S4-04 | Endpoint de compromissos com testes de intervalo e isolamento |
| Qui. 24/09 | S4-05 | Calendário responsivo com as três visualizações |
| Sex. 25/09 | S4-06 | Navegação anterior/próximo/Hoje integrada à API |
| Sáb. 26/09 | S4-07 | Testes, acessibilidade, correções e evidências |
| Dom. 27/09 | Reserva | Revisão da equipe, documentação e apresentação |

## Regras propostas

- Gestor visualiza os compromissos da própria equipe.
- Inspetor visualiza apenas compromissos em que participa.
- Esta entrega permite consultar a agenda; criação, edição e cancelamento ficam
  fora do escopo até que suas permissões e formulários sejam definidos.
- Guardar `inicio` e `fim` como datetimes conscientes em UTC no PostgreSQL.
- A API aceita limites ISO 8601 com offset obrigatório e retorna os horários em
  `America/Fortaleza`, normalmente `-03:00`.
- Um compromisso aparece quando há sobreposição com o intervalo consultado:
  `inicio < fim_consulta` e `fim > inicio_consulta`.
- O intervalo é semiaberto `[inicio, fim)`. Um evento que termina exatamente no
  início não entra; um evento que começa exatamente no fim também não entra.
- `fim` deve ser posterior a `inicio`; duração máxima da consulta: 42 dias.
- Ordenação: início crescente, fim crescente e ID como desempate.
- Eventos que atravessam meia-noite aparecem nos dias alcançados pelo intervalo.

As regras de acesso e apresentação precisam de revisão da equipe antes de serem
consideradas definitivas para uso institucional.

## Modelo mínimo

Criar `Compromisso` com:

| Campo | Uso |
| --- | --- |
| `titulo` | Identificação curta, até 200 caracteres |
| `descricao` | Informação complementar opcional |
| `inicio` e `fim` | Instantes conscientes armazenados em UTC |
| `tipo` | `reuniao` ou `atividade` |
| `equipe` | Define o escopo do gestor |
| `participantes` | Inspetores que visualizam o compromisso |
| `criador` | Usuário que originou o registro |
| `criado_em` e `atualizado_em` | Auditoria básica do servidor |

Criar índices por equipe/início/fim e participantes. Validar no modelo que o fim
é posterior ao início e que criador e participantes pertencem à equipe.

## Contrato inicial da API

`GET /api/compromissos/?inicio={ISO-8601}&fim={ISO-8601}`

Exemplo:

```text
/api/compromissos/?inicio=2026-09-21T00:00:00-03:00&fim=2026-09-28T00:00:00-03:00
```

Resposta:

```json
{
  "inicio": "2026-09-21T00:00:00-03:00",
  "fim": "2026-09-28T00:00:00-03:00",
  "timezone": "America/Fortaleza",
  "results": [
    {
      "id": 12,
      "titulo": "Reunião de alinhamento",
      "descricao": "Revisão das demandas críticas",
      "tipo": "reuniao",
      "inicio": "2026-09-22T09:00:00-03:00",
      "fim": "2026-09-22T10:00:00-03:00",
      "participantes": [{ "id": 7, "nome": "Inspetor de teste" }]
    }
  ]
}
```

Sem sessão retorna 401; usuário sem equipe retorna 403; limites ausentes,
inválidos, sem offset, invertidos ou acima de 42 dias retornam 400. Lista vazia
retorna 200 com `results: []`.

## Comportamento do calendário

### Controles compartilhados

- Cabeçalho com período atual, botões Anterior, Próximo e Hoje e seletor
  segmentado Dia/Semana/Mês.
- Alterar a visão preserva a data de referência e recalcula o intervalo.
- Anterior e Próximo avançam uma unidade da visão: um dia, uma semana ou um mês.
- Hoje define a referência para a data atual em `America/Fortaleza`. O botão fica
  desabilitado quando o período visível já contém hoje.
- A data de referência pode ficar na URL para permitir atualização e link direto;
  usar parâmetros `view` e `date`, validados no cliente.

### Dia

Linha do tempo com faixas horárias e cartões posicionados pela hora de início.
No celular, usar lista cronológica para evitar uma grade estreita.

### Semana

Sete colunas no desktop, começando na segunda-feira. No celular, apresentar dias
em sequência ou permitir rolagem somente dentro do calendário, sem alargar a página.

### Mês

Grade de semanas com resumo de até três compromissos por dia. Quando houver mais,
mostrar “+N” sem esconder a contagem. Selecionar um dia muda para a visão diária.

### Estados

- Loader anunciado enquanto o intervalo é consultado.
- Estado vazio informa que não há compromissos no período.
- Erro oferece nova tentativa sem perder visão ou data selecionadas.
- Resposta antiga deve ser cancelada ao navegar rapidamente.
- Sessão expirada encaminha para o login.

## Testes

### Back-end

- Gestor recebe somente compromissos da própria equipe.
- Inspetor recebe somente compromissos em que participa.
- Sobreposição inclui eventos que começam antes ou terminam depois do período.
- Limites exatos respeitam o intervalo semiaberto.
- Parâmetros inválidos e consultas acima de 42 dias retornam 400.
- Horários salvos em UTC são devolvidos em `America/Fortaleza`.
- Resultados seguem a ordenação estável e não geram uma consulta por participante.

### Front-end

- Dia/Semana/Mês calculam e enviam o intervalo correto.
- Anterior e Próximo movimentam a unidade da visualização ativa.
- Hoje retorna à data local atual e atualiza o intervalo apenas quando necessário.
- Mudança de visão mantém a data de referência.
- Eventos aparecem no dia e horário esperados em Fortaleza.
- Loader, vazio, erro, repetição e sessão expirada funcionam.
- Controles possuem nomes acessíveis e operam por teclado.
- Agenda não cria rolagem horizontal na página em 390 e 1366 px.

## Critérios de conclusão

- [ ] Regras, timezone e protótipo revisados pela equipe.
- [x] Migração e carga fictícia são reproduzíveis.
- [x] API filtra intervalo e acesso sem vazamento entre equipes e usuários.
- [x] API recebe instantes com offset e responde em `America/Fortaleza`.
- [ ] Visualizações Dia, Semana e Mês apresentam dados reais.
- [ ] Anterior, Próximo e Hoje consultam os intervalos corretos.
- [ ] Loader, vazio, erro e sessão expirada estão implementados.
- [ ] Testes Django e Playwright, lint, tipos, build e acessibilidade passaram.
- [ ] Documentação e Graphify atualizados.
- [ ] Cada tarefa concluída possui commit em português com sua validação.

## Fora do escopo

Não incluir criação, edição, cancelamento, convites externos, notificações,
recorrência, sincronização com calendários externos, conflitos de horário ou
arrastar e soltar. Esses recursos exigem regras adicionais e não são necessários
para validar a consulta e a navegação temporal desta entrega.
