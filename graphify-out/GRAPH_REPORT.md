# Graph Report - centraliza  (2026-09-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 935 nodes · 1408 edges · 97 communities (65 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9963cec3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 96

## God Nodes (most connected - your core abstractions)
1. `Demanda` - 21 edges
2. `rules` - 21 edges
3. `Compromisso` - 20 edges
4. `Usuario` - 17 edges
5. `react` - 16 edges
6. `csrfToken()` - 16 edges
7. `compilerOptions` - 16 edges
8. `ListagemDemandasTest` - 15 edges
9. `entrarComo()` - 15 edges
10. `AgendaCalendar()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `CompromissoListagemTest` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/tests.py → backend/agenda/models.py
- `GerenciamentoAgendaTest` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/tests.py → backend/agenda/models.py
- `Command` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/management/commands/seed_agenda.py → backend/agenda/models.py
- `CompromissoSerializer` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/serializers.py → backend/agenda/models.py
- `GerenciarCompromissoSerializer` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/serializers.py → backend/agenda/models.py

## Import Cycles
- None detected.

## Communities (97 total, 32 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (69): AnexosDemanda(), remove(), upload(), formatarTamanho(), AvaliarDemanda(), submit(), AvisoDetail(), data() (+61 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (54): metadata, metadata, metadata, AgendaCalendar(), changed(), changeView(), goToday(), move() (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (25): Command, atomic, BaseCommand, Compromisso, Meta, Tipo, CompromissoSerializer, DataHoraComOffsetField (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (39): categories, correctness, env, browser, builtin, node, options, typeAware (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (39): @base-ui/react, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, dependencies, @base-ui/react (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (5): DetalheHistoricoTest, GerenciamentoDemandasTest, ListagemDemandasTest, APITestCase, SessaoTest

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (31): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): AvisoAdmin, Aviso, Categoria, Meta, AvisoDetalheSerializer, AvisoFeedSerializer, GerenciarAvisoSerializer, Meta (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (23): Back-end, Comportamento do calendário, Contrato inicial da API, Controles compartilhados, Critérios de conclusão, Cronograma diário, Dia, Estados (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (21): Adicionar comentário, Alterar status, Back-end, Comportamento da interface, Consultar detalhe, Contrato inicial da API, Critérios de conclusão, Cronograma diário (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (12): DemandaAnexoDownloadView, DemandaAnexoView, DemandaComentarioView, DemandaStatusView, APIView, CsrfView, InspetorListView, LoginView (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (21): Back-end, Congelamento e apresentação, Contrato inicial da API, Critérios de conclusão, Cronograma diário, Detalhe, Detalhe, Direção visual (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (5): AvisoModelTest, TestCase, SeedAvisosTest, AnexosDemandaTest, override_settings

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (15): metadata, nextConfig, ignorePatterns, next-env.d.ts, localBindingConfig, build/**, components/ui/**, coverage/** (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.26
Nodes (5): enviarParaAvaliacao(), entrar(), entrarComo(), instalarApi(), Perfil

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (7): AbstractUser, Command, BaseCommand, Equipe, Meta, Perfil, Usuario

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (3): CompromissoListagemTest, GerenciamentoAgendaTest, APITestCase

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (16): Backlog posterior ao MVP, Definição de pronto, Etapa 1 — Regras e base do fluxo de demandas, Etapa 2 — Gerenciamento de demandas pelo gestor, Etapa 3 — Execução e avaliação da demanda, Etapa 4 — Anexos e evidências, Etapa 5 — Agenda gerenciável, Etapa 6 — Gestão de avisos (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (3): AvisoApiTest, GerenciamentoAvisosTest, APITestCase

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (10): adicionar_anexo(), pode_adicionar(), atomic, remover_anexo(), validar_arquivo(), Migration, AnexoDemanda, EventoDemanda (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (15): Architecture, Centraliza, Core capabilities, Data and security, Demonstration accounts, Home, Local development, Mobile navigation layout (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.30
Nodes (8): Demanda, Prioridade, Status, alterar_status_demanda(), criar_demanda(), editar_demanda(), atomic, RegraTransicao

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (8): AlterarStatusSerializer, AutorSerializer, CriarComentarioSerializer, DemandaDetalheSerializer, DemandaSerializer, EventoDemandaSerializer, Meta, ResponsavelSerializer

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (12): Conteúdo e estados da interface, Contrato inicial da API, Critérios de conclusão, Cronograma diário, Fora do escopo e contingência, Identidade e integração, Metas e tarefas, Modelo mínimo (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (8): API Centraliza, Endpoints disponíveis, Preparação local, Desempenho, Limitações atuais, Reproduzir, Resultado funcional, Validação técnica — listagem de demandas

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (9): Acesso e filtros, Contrato de listagem de demandas, Gerenciamento pelo gestor, Interface, Sessão, Transições, Estados, Fluxo operacional das demandas (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (10): ignorePatterns, printWidth, $schema, singleQuote, sortPackageJson, bun.lock, bun.lockb, package-lock.json (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (11): devDependencies, oxlint, @tailwindcss/postcss, @types/node, @vitejs/plugin-react, @vitejs/plugin-rsc, oxlint, @tailwindcss/postcss (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (5): GerenciarDemandaSerializer, DemandaDetailView, DemandaListView, demandas_permitidas(), QuerySet

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (8): Commits das tarefas de implementação, Entrega técnica concluída: semana 1, Graphify, Plano de desenvolvimento — Centraliza, Processo por tarefa, Próxima execução: MVP operacional, Próximas entregas propostas, Registro

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (8): Acesso inicial, Arquitetura desta entrega, Checklist técnico verificado, Contrato proposto para a API futura, Fora do escopo, Objetivo, Semana 1 — navegação, Validação automatizada realizada

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (8): scripts, build, dev, format, lint, start, test, typecheck

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (6): Checklist de demonstração — Status Report 1, Perguntas esperadas, Preparação do ambiente, Regra de congelamento, Roteiro de até 8 minutos, Smoke imediatamente antes da apresentação

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (5): Comportamentos verificados, Fluxo integrado real, Limitações, Resultado, Validação técnica — avisos e regressão do Status Report 1

### Community 39 - "Community 39"
Cohesion: 0.40
Nodes (3): Command, atomic, BaseCommand

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): Escopo entregue, Limites atuais, Validação da Agenda gerenciável, Verificações executadas

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (4): Escopo entregue, Limites antes de produção, Validação de anexos de demandas, Verificações executadas

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (4): Escopo entregue, Limites atuais, Validação dos avisos gerenciáveis, Verificações executadas

### Community 44 - "Community 44"
Cohesion: 0.40
Nodes (5): Inspeção visual, Limites e pendências para o uso institucional, Reproduzir, Resultado, Validação técnica — semana 1

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (3): Command, atomic, BaseCommand

## Knowledge Gaps
- **328 isolated node(s):** `Migration`, `Migration`, `Tipo`, `Meta`, `ParticipanteSerializer` (+323 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 0` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `plugins` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Usuario` connect `Community 16` to `Community 2`, `Community 7`, `Community 10`, `Community 20`, `Community 23`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `Compromisso` (e.g. with `Command` and `CompromissoSerializer`) actually correct?**
  _`Compromisso` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Migration`, `Migration`, `Tipo` to the rest of the system?**
  _328 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05350140056022409 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05160662122687439 - nodes in this community are weakly interconnected._