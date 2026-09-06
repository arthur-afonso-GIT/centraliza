# Plano de execução — avisos e Status Report 1

Período: **28/09 a 03/10**. Meta: entregar o MVP de avisos, executar a
regressão dos recursos essenciais e congelar uma versão demonstrável para o
Status Report 1 de 03/10.

## Ponto de partida

O Centraliza já possui autenticação por sessão, perfis e equipes, demandas com
lista, detalhe, histórico e transições, além da Agenda integrada. O módulo de
Avisos ainda é uma página provisória. Esta etapa completa a comunicação mínima
com um feed categorizado e detalhe, sem ampliar o escopo perto da apresentação.

## Metas e tarefas

| ID | Tarefa | Frente | Depende de | Entrega verificável |
| --- | --- | --- | --- | --- |
| S5-01 | Fechar regras e protótipo de avisos | Produto + design | — | Feed e detalhe em desktop/celular, estados e comportamento acessível documentados |
| S5-02 | Modelar avisos e carga de demonstração | Back-end | S5-01 | Modelo, migração e carga idempotente com avisos urgentes e informativos |
| S5-03 | Implementar APIs de feed e detalhe | Back-end | S5-02 | Endpoints autenticados, ordenados e isolados por equipe, com testes |
| S5-04 | Construir feed categorizado | Front-end | S5-01 e S5-03 | Lista responsiva com tags, data, remetente e estados de carregamento, vazio e erro |
| S5-05 | Integrar detalhe do aviso | Front-end | S5-03 e S5-04 | Abertura acessível do conteúdo completo, retorno ao feed e tratamento de sessão |
| S5-06 | Executar smoke e regressão MUST HAVE | QA | S5-05 | Login, navegação, demandas, agenda e avisos aprovados no fluxo integrado |
| S5-07 | Congelar e preparar a demonstração | Equipe | S5-06 | Versão identificada, checklist, roteiro, evidências e plano de contingência revisados |

Situação técnica: S5-02 concluída com modelo, migração, validação de autoria e
carga fictícia idempotente. S5-03 concluída com feed priorizado, detalhe e
isolamento por sessão e equipe. O contrato e a direção visual de S5-01 estão
prontos para revisão da equipe. S5-04 e S5-05 concluídas com feed responsivo,
tags textuais, detalhe navegável e estados de recuperação. A execução segue pela
regressão integrada e preparação da demonstração.

## Cronograma diário

| Data | Prioridade | Resultado esperado |
| --- | --- | --- |
| Seg. 28/09 | S5-01 | Regras, wireframe e contrato mínimo revisáveis |
| Ter. 29/09 | S5-02 e S5-03 | Persistência, carga fictícia e APIs cobertas por testes |
| Qua. 30/09 | S5-04 | Feed responsivo integrado aos dados reais |
| Qui. 01/10 | S5-05 | Detalhe acessível e fluxo completo de leitura |
| Sex. 02/10 | S5-06 | Regressão, correções críticas e evidências finais |
| Sáb. 03/10 | S5-07 | Código congelado e Status Report 1 apresentado |

## Escopo do MVP de avisos

### Regras propostas

- Gestores e inspetores visualizam avisos destinados à própria equipe.
- Um aviso possui categoria `urgente` ou `informativo`; a API rejeita outros
  valores.
- Avisos urgentes aparecem antes dos informativos. Dentro da categoria, os mais
  recentes aparecem primeiro, com ID como desempate estável.
- O feed apresenta título, resumo, categoria, autor e data de publicação.
- O detalhe apresenta o conteúdo completo e os mesmos metadados do feed.
- Título, resumo e categoria nunca dependem apenas de cor para serem entendidos.
- Abertura do detalhe deve funcionar por teclado e preservar um retorno claro ao
  feed.
- O MVP é somente leitura. Autoria, edição, cancelamento, destinatários
  individuais, confirmação de leitura e notificações ficam para outra entrega.

### Modelo mínimo

Criar `Aviso` com:

| Campo | Uso |
| --- | --- |
| `titulo` | Identificação curta, até 200 caracteres |
| `resumo` | Texto breve exibido no feed |
| `conteudo` | Corpo completo do comunicado |
| `categoria` | `urgente` ou `informativo` |
| `equipe` | Delimita quem pode consultar o aviso |
| `autor` | Gestor responsável pelo comunicado |
| `publicado_em` | Data usada na apresentação e ordenação |
| `criado_em` e `atualizado_em` | Auditoria básica do servidor |

Criar índices por equipe, categoria e publicação. Validar que o autor seja um
gestor ativo da equipe informada.

## Contrato inicial da API

### Feed

`GET /api/avisos/`

Resposta proposta:

```json
{
  "resultados": [
    {
      "id": 1,
      "titulo": "Plantão extraordinário",
      "resumo": "Mudança na escala desta sexta-feira.",
      "categoria": "urgente",
      "autor": "Gestora de teste 1",
      "publicado_em": "2026-10-01T09:00:00-03:00"
    }
  ]
}
```

### Detalhe

`GET /api/avisos/{id}/`

Retorna os campos do feed e `conteudo`. Aviso inexistente ou pertencente a
outra equipe retorna `404`, evitando revelar sua existência. Sem sessão válida,
ambos os endpoints retornam `401`.

## Direção visual

### Feed

- Cabeçalho “Avisos” com texto breve de orientação.
- Lista de cartões com título, resumo em até duas linhas, autor e data.
- Tag “Urgente” em vermelho claro com texto escuro; tag “Informativo” em fundo
  neutro com borda. As duas incluem texto explícito.
- O cartão inteiro pode abrir o detalhe, com foco visível e nome acessível.
- Celular usa uma coluna; desktop mantém largura confortável de leitura.

### Detalhe

- Exibir ação “Voltar aos avisos”, tag, título, autor, data e conteúdo.
- Usar página dedicada para manter URL navegável e suportar atualizar/voltar do
  navegador.
- Mostrar loader durante a consulta, mensagem com nova tentativa em falha e
  estado de item não encontrado.

## MUST HAVE do Status Report 1

O congelamento depende destes fluxos:

1. Entrar e sair com sessão válida; bloquear módulos sem autenticação.
2. Navegar por Home, Agenda, Avisos, Demandas e Chats em desktop e celular.
3. Listar e filtrar demandas; abrir detalhe, alterar status permitido e conferir
   o histórico atualizado.
4. Consultar Agenda em dia, semana e mês; navegar entre períodos e voltar a
   Hoje no horário de Fortaleza.
5. Consultar o feed de avisos, distinguir categorias e abrir um detalhe
   autorizado.
6. Exibir loading, vazio, erro recuperável e sessão expirada nos fluxos que
   dependem da API.

Chats permanece uma rota navegável de demonstração; troca real de mensagens não
é requisito deste Status Report.

## Estratégia de testes

### Back-end

- Modelo, escolhas, autor e equipe válidos.
- Feed autenticado, ordenação e isolamento entre equipes.
- Detalhe autorizado, `401` sem sessão e `404` para outra equipe.
- Quantidade constante de consultas para evitar N+1.

### Front-end

- Tags e metadados corretos no feed.
- Abertura por mouse e teclado, URL do detalhe e retorno pelo navegador.
- Loader, vazio, falha com repetição, item ausente e sessão expirada.
- Sem rolagem horizontal em 390 e 1366 px; Axe nas páginas de feed e detalhe.

### Regressão integrada

- Executar toda a suíte Django e Playwright.
- Executar lint, TypeScript e build de produção.
- Fazer smoke real com React, Django e PostgreSQL usando os dois perfis.
- Corrigir somente defeitos que bloqueiem MUST HAVE, segurança, dados,
  acessibilidade ou apresentação; registrar os demais no backlog.

## Congelamento e apresentação

Após a regressão aprovada:

1. Registrar hash do commit demonstrado e impedir novas funcionalidades.
2. Recriar o banco de demonstração com comandos documentados.
3. Confirmar credenciais locais dos perfis de gestor e inspetor.
4. Capturar telas principais e manter vídeo ou capturas como contingência.
5. Ensaiar um roteiro de até 8 minutos: problema, solução, gestor, inspetor,
   rastreabilidade, agenda, avisos e próximos passos.
6. Preparar respostas sobre arquitetura, permissões, testes, limitações e dados
   fictícios.
7. Criar correções após o congelamento somente em commits pequenos e
   identificados; repetir smoke e build após cada correção.

## Critérios de conclusão

- [ ] Regras e protótipo de feed/detalhe revisados pela equipe.
- [x] Migração e carga fictícia são reproduzíveis.
- [x] APIs de feed e detalhe isolam equipes e sessões corretamente.
- [x] Feed e detalhe funcionam com dados reais em desktop e celular.
- [x] Urgência é comunicada por texto e estilo acessível.
- [ ] Todos os fluxos MUST HAVE passam no smoke integrado.
- [ ] Testes Django e Playwright, lint, tipos e build passam.
- [ ] README, relatório técnico e Graphify estão atualizados.
- [ ] Commit da demonstração, roteiro e contingência estão registrados.
- [ ] Equipe aprovou o congelamento para apresentação em 03/10.

## Fora do escopo

Não incluir nesta etapa criação ou edição de avisos, destinatários individuais,
confirmação de leitura, notificações, anexos, pesquisa, paginação ou chat real.
Esses recursos não são necessários para demonstrar o fluxo mínimo e aumentariam
o risco do congelamento.
