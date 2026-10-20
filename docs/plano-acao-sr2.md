# Plano de ação até o SR2 — Centraliza

**Período:** 20/10/2026 a 05/12/2026  
**Equipe:** Tech Lead, 4 pessoas desenvolvedoras e 1 QA  
**Marco:** apresentação do SR2 em 05/12/2026

## 1. Objetivo do ciclo

Entregar e demonstrar um fluxo confiável entre gestor e inspetor, cobrindo
demandas, anexos, Agenda e avisos com PostgreSQL real. O ciclo deve terminar
com evidências de teste, versão identificada e roteiro de demonstração
repetível.

Chat permanece uma meta condicional. Ele só entra no compromisso do SR2 se o
núcleo estiver aprovado pelo QA até 22/11.

## 2. Diagnóstico do estado atual

| Área | Estado técnico | Lacuna até o SR2 |
| --- | --- | --- |
| Sessão, contas e equipes | Implementado | Validar o fluxo integrado e a administração com a equipe real do projeto |
| Demandas | Criação, edição, atribuição, aceite, execução, avaliação, correção, cancelamento e filtros implementados | Aprovar formalmente quem pode alterar prazo, prioridade e status; executar regressão integrada |
| Histórico | Eventos, comentários, anexos e transições implementados | Confirmar terminologia e provar consistência no fluxo completo |
| Anexos | Upload, download protegido e remoção lógica implementados | Testar com armazenamento e PostgreSQL da homologação; registrar limites operacionais |
| Agenda | Criação, edição, cancelamento, participantes, vínculo e conflitos implementados | Validar aviso ao participante e comportamento real de timezone |
| Avisos | Publicação, edição, destinatários, vigência, cancelamento e leitura implementados | Implementar rascunho explícito e separar salvar de publicar |
| Chat | Somente rota e estado vazio | Backend, persistência, lista, histórico e filtros ainda não existem |
| Testes | 100 testes Django e 53 cenários Playwright com API simulada | Criar smoke integrado com React, Django e PostgreSQL reais |
| Implantação | Execução local documentada | Preparar ambiente de homologação, backup, restauração e versão da demo |
| Integração SEI | Protótipo demonstrativo com páginas fictícias | Integração institucional real permanece fora do aceite do SR2 |

## 3. Decisão de escopo

### Must have

- Regras de prazo, prioridade e status aprovadas e refletidas no código.
- Fluxo completo de demanda validado nos dois perfis.
- Anexos validados no fluxo real.
- Agenda com participantes, conflitos e timezone validada.
- Avisos com rascunho, publicação, destinatários e leitura.
- Smoke integrado sem API simulada.
- Homologação, massa fictícia, backup, restauração e roteiro de apresentação.
- Nenhum defeito P0 ou P1 aberto no congelamento.

### Should have

- Aviso interno gerado para participantes de reunião criada ou alterada.
- Melhorias de mensagens de erro e estados de recuperação encontradas pelo QA.
- Verificação de desempenho da listagem com 1.000 demandas fictícias.
- Revisão manual de acessibilidade e responsividade dos fluxos principais.

### Could have

- HU 31: lista e abertura de conversas persistidas.
- HU 32: filtros de conversas por palavra-chave, data e participante.
- Polimentos de interface sem impacto nos critérios de aceite.

### Fora do compromisso do SR2

- Chat em tempo real, presença e notificações push.
- Integração com o SEI institucional sem autorização e amostras anonimizadas.
- Recorrência e sincronização externa da Agenda.
- Relatórios analíticos avançados.
- Uso de dados reais da VISAT.

## 4. Organização da equipe

Os nomes devem substituir as identificações abaixo durante o planejamento.

| Papel | Responsabilidade principal | Revisão cruzada |
| --- | --- | --- |
| Tech Lead | Decisões de regra e arquitetura, corte de escopo, desbloqueios, revisão de mudanças críticas e integração final | Não assumir uma fila fixa de implementação |
| Dev 1 | Domínio e API de demandas, permissões e histórico | Revisado por Dev 3 |
| Dev 2 | Interface de demandas, anexos e experiência dos dois perfis | Revisado por Dev 4 |
| Dev 3 | Agenda e avisos no backend, modelos e serviços | Revisado por Dev 1 |
| Dev 4 | Agenda e avisos no frontend, integração real e apoio à homologação | Revisado por Dev 2 |
| QA | Matriz, massa, smoke, exploratório, evidências, defeitos e retestes | Atua desde o início de cada sprint |

As pessoas mantêm uma área principal para reduzir troca de contexto, mas cada
pull request deve ter revisão de outra área. O Tech Lead não deve ser o único
revisor nem entrar na capacidade como um quinto desenvolvedor.

## 5. Capacidade e regras de execução

- Planejar no máximo **70% da capacidade dos quatro desenvolvedores**. Reservar
  20% para correções e integração e 10% para revisão e documentação.
- Limitar cada pessoa a **uma tarefa em desenvolvimento por vez**.
- Dividir tarefas para caberem em um ou dois dias úteis de trabalho da equipe.
- Abrir pull request cedo; evitar acumular a integração para o fim da sprint.
- Toda funcionalidade deve incluir teste automatizado pertinente e instrução de
  teste manual para o QA.
- QA inicia o teste assim que o primeiro fluxo vertical estiver disponível.
- Uma tarefa só entra em `Concluído` após revisão, integração e aceite do QA.

## 6. Cronograma de execução

### Preparação — 20/10 a 22/10

**Meta:** transformar o cronograma em backlog executável.

- Tech Lead: reunir a equipe e aprovar a matriz de permissões de prazo,
  prioridade e status.
- Tech Lead + QA: revisar critérios das HUs 3, 4, 9, 11, 16, 17, 18, 22, 26,
  27, 28 e 29.
- Devs: reproduzir o projeto do zero usando o README e registrar qualquer
  dependência implícita.
- QA: preparar massa e cartões de defeito conforme `docs/plano-qa.md`.
- Equipe: colocar responsável, revisor, critério e estimativa em cada cartão.

**Saída:** nenhuma tarefa de Sprint 1 depende de uma decisão de negócio aberta.

### Sprint 1 — 20/10 a 01/11

**Meta:** fechar regras e indicadores de demandas — HUs 3, 4, 9, 16 e 17.

| Frente | Trabalho |
| --- | --- |
| Dev 1 | Ajustar API, permissões e histórico conforme a matriz aprovada; cobrir transições negadas e permitidas |
| Dev 2 | Ajustar formulários, ações disponíveis, filtros e feedback de prazo, prioridade, atraso e criticidade |
| Dev 3 | Revisar concorrência/transações e preparar dados integrados de demandas |
| Dev 4 | Criar a infraestrutura Playwright integrada e automatizar login + criação + atribuição |
| QA | Executar DEM-01, DEM-02, DEM-03, DEM-09, DEM-10 e DEM-11; testar desktop e celular |

**Gate em 01/11:** fluxo criação → atribuição → aceite → início funciona com
PostgreSQL real e as regras estão registradas.

### Sprint 2 — 02/11 a 08/11

**Meta:** concluir execução e rastreabilidade — HUs 11, 18 e 22, com regressão
das HUs 7, 8, 12, 19, 20 e 21.

| Frente | Trabalho |
| --- | --- |
| Dev 1 | Revisar conclusão, avaliação, correção, reatribuição e acesso posterior autorizado |
| Dev 2 | Fechar resumo da entrega, timeline, correção e estados após atualização da página |
| Dev 3 | Revisar anexos, histórico imutável e regras de acesso entre equipes |
| Dev 4 | Completar o smoke integrado de demanda e anexos |
| QA | Executar DEM-04 a DEM-08, ANX-01 a ANX-07 e regressão de isolamento |

**Gate em 08/11:** demanda percorre o ciclo completo, mantém histórico e anexo e
continua consistente após logout/login.

### Sprint 3 — 09/11 a 15/11

**Meta:** consolidar reuniões e participantes — HUs 26 e 27, com regressão das
HUs 23, 24 e 25.

| Frente | Trabalho |
| --- | --- |
| Dev 1 | Apoiar correções P0/P1 de demandas e revisar API de Agenda |
| Dev 2 | Apoiar correções de demandas e revisar experiência do calendário |
| Dev 3 | Fechar regras de participantes, conflitos e evento/aviso ao participante |
| Dev 4 | Integrar Agenda ao backend real e cobrir timezone, edição e cancelamento |
| QA | Executar AGD-01 a AGD-08 e regressão do núcleo de demandas |

**Gate em 15/11:** reunião criada pelo gestor aparece corretamente para os
participantes, conflitos são informados e horários permanecem em Fortaleza.

### Sprint 4 — 16/11 a 22/11

**Meta:** fechar ciclo de avisos — HUs 28 e 29 — e decidir sobre chat.

| Frente | Trabalho |
| --- | --- |
| Dev 1 | Corrigir defeitos acumulados e revisar autorização dos avisos |
| Dev 2 | Corrigir defeitos acumulados e revisar acessibilidade dos avisos |
| Dev 3 | Implementar rascunho/publicação explícitos, destinatários e auditoria |
| Dev 4 | Implementar interface de rascunho, publicação, leitura e estados de erro |
| QA | Executar AVS-01 a AVS-07 e smoke integrado de demandas, Agenda e avisos |

**Gate de escopo em 22/11:** chat só é iniciado se:

1. não houver P0 ou P1 aberto;
2. smoke integrado estiver verde;
3. rascunho/publicação de avisos estiver aprovado;
4. Agenda e anexos estiverem aprovados;
5. equipe estimar HU 31 e 32 dentro da capacidade restante.

Se qualquer condição falhar, chat fica fora do SR2 e todos trabalham na
estabilização.

### Sprint 5 — 23/11 a 29/11

**Meta principal:** integração, correções e preparação da versão candidata.

**Caminho A — núcleo ainda possui defeitos:** quatro desenvolvedores corrigem
P0/P1, completam testes integrados e melhoram recuperação de falhas.

**Caminho B — gate do chat aprovado:** Dev 1 e Dev 2 implementam persistência,
API, lista e abertura de conversas; Dev 3 e Dev 4 implementam filtros e interface.
O QA mantém regressão do núcleo e testa o chat sem reduzir a cobertura anterior.

**Gate em 29/11:** versão candidata identificada, instalação limpa reproduzida,
smoke aprovado e lista de limitações pronta.

### Congelamento — 30/11 a 04/12

- Não iniciar funcionalidades.
- Corrigir somente P0, P1 e regressões causadas pelas correções.
- Executar toda a matriz P0/P1 e o smoke em instalação limpa.
- Testar backup e restauração do banco e dos anexos.
- Atualizar README, Graphify, documentação e evidências.
- Registrar commit/tag da versão demonstrada.
- Ensaiar apresentação com plano de contingência para indisponibilidade.

**05/12:** executar o roteiro aprovado e apresentar limitações sem prometer
integrações ainda não validadas.

## 7. Fluxo dos cartões

Usar as listas:

`Backlog → Pronto → Em desenvolvimento → Em revisão → Em QA → Concluído`

Usar `Bloqueado` apenas quando existir impedimento externo ou decisão pendente.
O cartão deve informar o bloqueio, responsável pela resolução e próxima data de
verificação.

Cada cartão precisa conter:

- HU e objetivo observável;
- critério de aceite;
- responsável e revisor;
- dependências;
- checklist de backend, frontend, testes e documentação quando aplicável;
- link do pull request;
- instruções de teste;
- evidência do QA;
- commit ou versão validada.

## 8. Política de branches e revisão

- Branch curta: `feature/hu-XX-resumo` ou `fix/descricao-curta`.
- Pull request pequeno, com um comportamento principal.
- Uma aprovação de pessoa revisora da área cruzada.
- Mudança em permissões, migrations, autenticação ou anexos exige revisão do
  Tech Lead.
- Autor não move o próprio cartão diretamente de `Em revisão` para `Concluído`.
- Merge somente com testes pertinentes, tipos, lint e build aprovados.

## 9. Reuniões e comunicação

- **Planejamento semanal, 40 min:** selecionar tarefas conforme capacidade e
  revisar riscos.
- **Daily assíncrona:** feito, próximo passo e bloqueio em três linhas.
- **Integração, terça e quinta, 20 min:** demonstrar no ambiente integrado.
- **Triagem com QA, duas vezes por semana, 20 min:** priorizar defeitos e retestes.
- **Demonstração e retrospectiva, fim da semana, 30 min:** mostrar somente o que
  funciona e escolher uma melhoria de processo.

## 10. Indicadores do Tech Lead

Acompanhar semanalmente:

- tarefas em desenvolvimento há mais de três dias;
- pull requests esperando revisão há mais de um dia útil;
- P0/P1 abertos e idade de cada um;
- percentual dos cenários P0/P1 executados na versão atual;
- sucesso do smoke integrado;
- quantidade de tarefas concluídas que retornaram por falha de aceite.

Não usar linhas de código ou quantidade de commits para avaliar pessoas.

## 11. Riscos e respostas

| Risco | Resposta |
| --- | --- |
| Regras de papéis continuam ambíguas | Tech Lead fecha a matriz até 22/10; sem decisão, tarefa não entra em desenvolvimento |
| API simulada esconde falhas de integração | Dev 4 cria o smoke real na Sprint 1 |
| Chat consome a reserva de estabilização | Gate obrigatório em 22/11 e corte automático se o núcleo não estiver verde |
| QA recebe tudo no fim | Cada fluxo vai para QA assim que integrado; WIP limitado |
| Dependência excessiva do Tech Lead | Revisão cruzada fixa e documentação das decisões |
| Demonstração depende de ambiente instável | Instalação limpa, massa idempotente, backup e roteiro alternativo |
| Escopo SEI é interpretado como integração real | Apresentar explicitamente como protótipo com páginas fictícias |

## 12. Definição de pronto do SR2

- Demandas, anexos, Agenda e avisos funcionam com banco real.
- Perfis e equipes não acessam dados indevidos.
- Histórico mantém autor, horário e justificativa das ações relevantes.
- Smoke integrado e testes automatizados passam no commit candidato.
- QA executou todos os cenários P0/P1 e anexou evidências.
- Não existem defeitos P0/P1 abertos.
- Backup e restauração foram testados.
- README, Graphify, limitações e roteiro de demonstração estão atualizados.
- A equipe consegue executar a apresentação sem depender de uma única pessoa.
