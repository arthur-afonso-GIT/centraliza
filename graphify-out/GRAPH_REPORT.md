# Graph Report - centraliza  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1326 nodes · 2146 edges · 140 communities (93 shown, 47 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92bf52b7`
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
- Community 63
- Community 64
- Community 65
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
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 139

## God Nodes (most connected - your core abstractions)
1. `csrfToken()` - 28 edges
2. `Compromisso` - 24 edges
3. `Demanda` - 23 edges
4. `Usuario` - 22 edges
5. `react` - 22 edges
6. `rules` - 21 edges
7. `instalarApi()` - 20 edges
8. `entrarComo()` - 20 edges
9. `ListagemDemandasTest` - 18 edges
10. `ApiError` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Command` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/management/commands/seed_agenda.py → backend/agenda/models.py
- `CompromissoListagemTest` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/tests.py → backend/agenda/models.py
- `CompromissoModelTest` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/tests.py → backend/agenda/models.py
- `GerenciamentoAgendaTest` --uses--> `Compromisso`  [INFERRED]
  backend/agenda/tests.py → backend/agenda/models.py
- `ResumoHomeView` --uses--> `Compromisso`  [INFERRED]
  backend/demandas/dashboard.py → backend/agenda/models.py

## Import Cycles
- None detected.

## Communities (140 total, 47 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (8): AnexosDemandaTest, criar_demanda_teste(), DetalheHistoricoTest, GerenciamentoDemandasTest, ImportacaoSeiTest, ParticipacaoEntreEquipesTest, APITestCase, SessaoTest

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (24): AtualizarEquipeSerializer, AtualizarMembroEquipeSerializer, CriarEquipeSerializer, CriarMembroEquipeSerializer, EquipeSerializer, MembroEquipeSerializer, Meta, VinculoEquipeSerializer (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (34): CompromissoForm(), submit(), local(), offset(), filtrosVazios, prioridadeLabel, segmentos, statusLabel (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (39): @base-ui/react, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, dependencies, @base-ui/react (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (20): Compromisso, Meta, Tipo, CompromissoSerializer, DataHoraComOffsetField, GerenciarCompromissoSerializer, Meta, ParticipanteSerializer (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (19): AvisoAdmin, Aviso, Categoria, LeituraAviso, Meta, AvisoDetalheSerializer, GerenciarAvisoSerializer, AvisoDetailView (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (29): AgendaCalendar(), changed(), changeView(), goToday(), move(), prepare(), retry(), dateLabel() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (25): AvisoDetail(), data(), agoraLocal(), AvisoForm(), changeOpen(), submit(), local(), offset() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (31): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (14): metadata, metadata, metadata, metadata, LoginScreen(), ModuleContent(), WorkspaceLayout(), escolherEquipe() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (18): normalizar_numero_sei(), Gera uma chave tolerante para busca sem presumir o formato institucional., interpretar_texto_sei(), normalizar_rotulo(), Migration, AnexoDemanda, Demanda, EventoDemanda (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (22): EquipeManagement(), submitEquipe(), MembroForm(), submit(), novo, dateTime(), day(), HomeDashboard() (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (20): Capture, CaptureSei(), receive(), request(), submit(), empty, readCapture(), DemandaForm() (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (26): API planejada, Backlog posterior, Ciclo 0 — Descoberta e acordo institucional, Ciclo 1 — Identidade SEI e pesquisa, Ciclo 2 — Colar, interpretar e confirmar, Ciclo 3 — Administração de equipes e usuários, Ciclo 4 — Home por perfil, prazos e alertas, Ciclo 5 — Execução estruturada da inspeção (+18 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (5): enviarParaAvaliacao(), entrar(), entrarComo(), instalarApi(), Perfil

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (25): A-001 — Tela de pesquisa do SEI, Amostras necessárias, Catálogo provisório de campos, Como anonimizar, Critérios para encerrar o Ciclo 0, D-001 — Identidade interna, D-002 — Entrada progressiva, D-003 — Confirmação humana (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (23): Back-end, Comportamento do calendário, Contrato inicial da API, Controles compartilhados, Critérios de conclusão, Cronograma diário, Dia, Estados (+15 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (14): CamposImportacaoSeiSerializer, CriarImportacaoSeiSerializer, ImportacaoSeiSerializer, DemandaSeiDuplicidadeView, DemandaStatusView, exigir_gestor_importacao(), importacao_sei_permitida(), ImportacaoSeiDetailView (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (4): AvisoApiTest, GerenciamentoAvisosTest, LeituraAvisoTest, APITestCase

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (21): Adicionar comentário, Alterar status, Back-end, Comportamento da interface, Consultar detalhe, Contrato inicial da API, Critérios de conclusão, Cronograma diário (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (17): AvaliarDemanda(), submit(), CancelarDemanda(), cancel(), data(), DemandaDetail(), advance(), comment() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (21): Back-end, Congelamento e apresentação, Contrato inicial da API, Critérios de conclusão, Cronograma diário, Detalhe, Detalhe, Direção visual (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (21): rules, import/no-anonymous-default-export, no-array-constructor, no-var, prefer-const, prefer-rest-params, prefer-spread, react/display-name (+13 more)

### Community 24 - "Community 24"
Cohesion: 0.19
Nodes (7): AbstractUser, Equipe, Meta, Papel, Perfil, Usuario, VinculoEquipe

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (9): awaitComplete(), finish(), updated(), openCapture(), extractVisibleFields(), element(), page(), send (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.19
Nodes (3): CompromissoListagemTest, GerenciamentoAgendaTest, APITestCase

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (16): action, default_popup, default_title, background, service_worker, type, content_scripts, description (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.17
Nodes (8): GerenciarDemandaSerializer, criar_demanda(), DemandaDetailView, DemandaListView, demandas_permitidas(), ImportacaoSeiConfirmarView, atomic, QuerySet

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (3): AdministracaoEquipeTest, ListaInspetoresTest, APITestCase

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (14): 1. Contexto e objetivos, 2. Diagnóstico investigativo da base, 3. Blueprint arquitetural, 4. Roadmap sequencial, 5. Estratégia de testes e validação, 6. Contingência e rollback, Fase 0 — Fechar decisões e critérios, Fase 1 — Número obrigatório em novas demandas (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.32
Nodes (10): useSession(), login(), logout(), cookie(), csrfToken(), entrar(), obterUsuarioAtual(), responseJson() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (13): Architecture, Centraliza, Core capabilities, Data and security, Demonstration accounts, Local development, Overview, Product direction (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.23
Nodes (4): AvisoModelTest, TestCase, SeedAvisosTest, override_settings

### Community 35 - "Community 35"
Cohesion: 0.23
Nodes (9): AlterarStatusSerializer, alterar_status_demanda(), decidir_participacao(), editar_demanda(), atomic, RegraTransicao, solicitar_participacao(), DemandaSolicitarParticipacaoView (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (12): Conteúdo e estados da interface, Contrato inicial da API, Critérios de conclusão, Cronograma diário, Fora do escopo e contingência, Identidade e integração, Metas e tarefas, Modelo mínimo (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (11): @axe-core/playwright, devDependencies, @axe-core/playwright, oxlint, @types/node, @vitejs/plugin-react, @vitejs/plugin-rsc, oxlint (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (4): AvisoFeedSerializer, Meta, APIView, ResumoHomeView

### Community 39 - "Community 39"
Cohesion: 0.27
Nodes (7): adicionar_anexo(), pode_adicionar(), atomic, remover_anexo(), validar_arquivo(), DemandaAnexoDownloadView, DemandaAnexoView

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (9): AnexosDemanda(), remove(), upload(), formatarTamanho(), AnexoDemanda, enviarAnexo(), excluirAnexo(), listarAnexos() (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (10): ignorePatterns, printWidth, $schema, singleQuote, sortPackageJson, bun.lock, bun.lockb, package-lock.json (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (10): categories, correctness, env, browser, builtin, node, options, typeAware (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (6): CriarComentarioSerializer, DemandaDetalheSerializer, DemandaSerializer, EventoDemandaSerializer, Meta, DemandaComentarioView

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (8): API Centraliza, Endpoints disponíveis, Preparação local, Desempenho, Limitações atuais, Reproduzir, Resultado funcional, Validação técnica — listagem de demandas

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (10): ignorePatterns, next-env.d.ts, build/**, components/ui/**, coverage/**, dist/**, hooks/use-mobile.ts, out/** (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (5): Aceite — história 7, Correções — história 14, Estados, Fluxo operacional das demandas, Matriz de transições

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (8): Commits das tarefas de implementação, Entrega técnica concluída: semana 1, Graphify, Plano de desenvolvimento — Centraliza, Processo por tarefa, Próxima execução: MVP operacional, Próximas entregas propostas, Registro

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (8): Backlog posterior ao MVP, Definição de pronto, Objetivo, Padrão de implementação por tarefa, Plano de desenvolvimento — MVP operacional do Centraliza, Próxima ação recomendada, Situação atual, Sugestão de ciclos

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (8): Etapa 1 — Regras e base do fluxo de demandas, Etapa 2 — Gerenciamento de demandas pelo gestor, Etapa 3 — Execução e avaliação da demanda, Etapa 4 — Anexos e evidências, Etapa 5 — Agenda gerenciável, Etapa 6 — Gestão de avisos, Etapa 7 — Painel, estabilização e implantação de homologação, Ordem de execução

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (8): Acesso inicial, Arquitetura desta entrega, Checklist técnico verificado, Contrato proposto para a API futura, Fora do escopo, Objetivo, Semana 1 — navegação, Validação automatizada realizada

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (8): plugins, eslint, import, jsx-a11y, nextjs, oxc, typescript, unicorn

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (8): scripts, build, dev, format, lint, start, test, typecheck

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (7): Acesso e filtros, Contrato de listagem de demandas, Entrada assistida do SEI, Gerenciamento pelo gestor, Interface, Sessão, Transições

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (6): Checklist de demonstração — Status Report 1, Perguntas esperadas, Preparação do ambiente, Regra de congelamento, Roteiro de até 8 minutos, Smoke imediatamente antes da apresentação

### Community 58 - "Community 58"
Cohesion: 0.52
Nodes (7): DemandasList(), changePage(), moveTab(), prepareRequest(), retry(), select(), updateFilter()

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (7): Agenda, Chats, Home, Notices, Requests, Screenshots, Team

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (5): API, Avisos e confirmação de leitura — história 30, Comportamento, Instalação, Interface

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (5): Comportamentos verificados, Fluxo integrado real, Limitações, Resultado, Validação técnica — avisos e regressão do Status Report 1

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (3): metadata, nextConfig, .next/**

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (3): Command, atomic, BaseCommand

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (4): Escopo entregue, Limites atuais, Validação da Agenda gerenciável, Verificações executadas

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): Escopo entregue, Limites antes de produção, Validação de anexos de demandas, Verificações executadas

### Community 70 - "Community 70"
Cohesion: 0.40
Nodes (4): Escopo entregue, Limites atuais, Validação dos avisos gerenciáveis, Verificações executadas

### Community 71 - "Community 71"
Cohesion: 0.40
Nodes (5): Inspeção visual, Limites e pendências para o uso institucional, Reproduzir, Resultado, Validação técnica — semana 1

### Community 72 - "Community 72"
Cohesion: 0.40
Nodes (4): private, scripts, test, type

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (3): Command, atomic, BaseCommand

### Community 74 - "Community 74"
Cohesion: 0.50
Nodes (3): Command, atomic, BaseCommand

### Community 78 - "Community 78"
Cohesion: 0.50
Nodes (3): Current scope, Endpoints, Team management contract

## Knowledge Gaps
- **430 isolated node(s):** `Migration`, `Migration`, `Tipo`, `Meta`, `ParticipanteSerializer` (+425 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Usuario` connect `Community 24` to `Community 1`, `Community 10`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `react` connect `Community 9` to `Community 32`, `Community 2`, `Community 6`, `Community 7`, `Community 40`, `Community 11`, `Community 12`, `Community 21`, `Community 53`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `plugins` connect `Community 53` to `Community 9`, `Community 42`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `Compromisso` (e.g. with `Command` and `CompromissoSerializer`) actually correct?**
  _`Compromisso` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Migration`, `Migration`, `Tipo` to the rest of the system?**
  _430 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05587808417997097 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._