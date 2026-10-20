# Plano de QA — Centraliza

## 1. Objetivo

Validar que o Centraliza permite ao gestor e ao inspetor executar o fluxo de
trabalho da VISAT com dados consistentes, isolamento entre equipes e feedback
compreensível. O foco inicial é o núcleo do produto: sessão e perfis, gestão de
demandas, anexos, Agenda e avisos.

O chat e recursos avançados ficam fora da bateria obrigatória enquanto não
fizerem parte do MVP aprovado.

## 2. Estratégia

A validação será executada em quatro camadas:

1. **Testes de backend:** regras de negócio, autorização, validação, persistência
   e respostas da API com Django REST Framework.
2. **Testes de interface:** comportamento dos fluxos no navegador com
   Playwright, incluindo estados de carregamento, erro e sucesso.
3. **Testes integrados:** frontend, backend e PostgreSQL reais, sem interceptar
   a API, para provar que contratos e persistência funcionam juntos.
4. **Teste exploratório e aceite:** execução humana dos fluxos prioritários em
   desktop e celular, com registro de evidências e defeitos.

Os testes Playwright existentes usam uma API simulada em
`frontend/tests/support/api.ts`. Eles são adequados para comportamento visual,
mas não substituem a bateria integrada com Django e PostgreSQL.

## 3. Estado inicial da automação

| Camada | Estado encontrado | Finalidade |
| --- | ---: | --- |
| Django/API | 100 testes | Regras, permissões, persistência e contratos |
| Playwright | 53 cenários | Fluxos de interface, responsividade e acessibilidade |
| Extensão SEI | 4 testes | Extração e comunicação da extensão demonstrativa |
| Integração real | Parcial/manual | Validar React + Django + PostgreSQL juntos |

## 4. Prioridades

- **P0 — bloqueador:** autenticação quebrada, acesso a dados de outra equipe,
  perda de dados, download indevido de anexo ou fluxo principal impossível.
- **P1 — crítico:** regra de status incorreta, histórico inconsistente, agenda
  com horário incorreto, aviso entregue ao destinatário errado ou falha sem
  recuperação.
- **P2 — relevante:** validação, feedback, responsividade ou acessibilidade que
  dificulta o uso, mas possui alternativa.
- **P3 — melhoria:** problema visual ou textual sem impacto no fluxo.

Nenhum P0 ou P1 pode permanecer aberto para a demonstração ou homologação.

## 5. Massa e perfis de teste

Usar somente dados fictícios. Preparar:

- duas equipes, A e B;
- um gestor administrador e um gestor comum por equipe;
- dois inspetores ativos e um inativo por equipe;
- demandas sem responsável, atribuídas, atrasadas, críticas e em cada status;
- arquivos PDF, JPEG e PNG válidos, além de tipo, assinatura e tamanho inválidos;
- compromissos comuns, contíguos, sobrepostos e cancelados;
- avisos gerais, direcionados, urgentes, informativos, futuros e expirados.

## 6. Matriz de testes obrigatórios

### 6.1 Sessão, contas e equipes

| ID | Cenário | Resultado esperado | Tipo | Prioridade |
| --- | --- | --- | --- | --- |
| AUT-01 | Login válido de gestor e inspetor | Sessão criada e perfil correto exibido | Automático + integrado | P0 |
| AUT-02 | Login com senha inválida | Erro genérico, sem revelar se a conta existe | Automático | P1 |
| AUT-03 | Acessar rota privada sem sessão | Redirecionamento para login e API retorna 401 | Automático | P0 |
| AUT-04 | Logout e tentativa de voltar pelo navegador | Sessão encerrada e conteúdo privado indisponível | Automático + exploratório | P0 |
| EQP-01 | Gestor autorizado cria e edita integrante | Alteração limitada à própria equipe | Automático + integrado | P1 |
| EQP-02 | Inspetor tenta administrar integrantes | Interface não oferece ação e API retorna 403 | Automático | P0 |
| EQP-03 | Alternar equipe ativa | Listas e permissões passam a considerar a equipe escolhida | Automático + integrado | P1 |

### 6.2 Gestão de demandas

| ID | Cenário | Resultado esperado | Tipo | Prioridade |
| --- | --- | --- | --- | --- |
| DEM-01 | Gestor cria e atribui demanda | Demanda persiste, aparece ao inspetor e registra histórico | Automático + integrado | P0 |
| DEM-02 | Inspetor aceita e inicia a demanda | Transições válidas e autoria registradas | Automático + integrado | P0 |
| DEM-03 | Inspetor tenta pular o aceite | Operação rejeitada sem criar evento inválido | Automático | P1 |
| DEM-04 | Inspetor envia para avaliação | Resumo obrigatório e item disponível ao gestor | Automático + integrado | P0 |
| DEM-05 | Gestor aprova | Status final e histórico consistentes | Automático + integrado | P0 |
| DEM-06 | Gestor solicita correção | Justificativa obrigatória e novo ciclo preserva o anterior | Automático + integrado | P0 |
| DEM-07 | Gestor reatribui demanda | Responsável anterior perde edição; novo responsável precisa aceitar | Automático + integrado | P0 |
| DEM-08 | Cancelar demanda ativa | Motivo obrigatório, remoção das listas ativas e histórico preservado | Automático | P1 |
| DEM-09 | Filtrar por status, crítica, atraso, prazo e responsável | Resultados corretos e isolamento por perfil/equipe | Automático | P1 |
| DEM-10 | Atualizar a página após cada ação | Estado continua correto no banco e na interface | Integrado | P0 |
| DEM-11 | Abrir demanda de outra equipe | Resposta 404/sem vazamento de identificação | Automático | P0 |
| DEM-12 | Número SEI duplicado ou inválido | Aviso/bloqueio conforme regra e sem exposição externa | Automático | P1 |

### 6.3 Anexos e evidências

| ID | Cenário | Resultado esperado | Tipo | Prioridade |
| --- | --- | --- | --- | --- |
| ANX-01 | Enviar PDF, JPEG e PNG válidos | Upload concluído, metadados e histórico registrados | Automático + integrado | P0 |
| ANX-02 | Enviar extensão, MIME ou assinatura incompatível | Arquivo rejeitado e nenhuma evidência persistida | Automático | P0 |
| ANX-03 | Enviar arquivo acima de 10 MB | Rejeição com mensagem compreensível | Automático + exploratório | P1 |
| ANX-04 | Baixar como gestor e inspetor responsável | Conteúdo correto e nome original preservado | Automático + integrado | P0 |
| ANX-05 | Usuário externo tenta listar ou baixar | Acesso negado sem revelar metadados | Automático | P0 |
| ANX-06 | Remover anexo | Remoção lógica; download bloqueado e histórico mantido | Automático + integrado | P1 |
| ANX-07 | Falha durante upload | Interface permite repetir sem duplicar o arquivo | Exploratório | P1 |

### 6.4 Agenda

| ID | Cenário | Resultado esperado | Tipo | Prioridade |
| --- | --- | --- | --- | --- |
| AGD-01 | Gestor cria compromisso | Evento aparece para gestor e participantes | Automático + integrado | P0 |
| AGD-02 | Editar data, horário e participantes | Calendário atualiza sem recarregar a aplicação | Automático + integrado | P1 |
| AGD-03 | Criar compromisso sobreposto | API retorna conflito útil e nada é salvo | Automático | P1 |
| AGD-04 | Criar intervalos contíguos | Operação permitida | Automático | P2 |
| AGD-05 | Fim anterior ou igual ao início | Validação impede o envio | Automático | P1 |
| AGD-06 | Cancelar compromisso | Cancelamento preserva autoria/data e some da agenda ativa | Automático + integrado | P1 |
| AGD-07 | Navegar dia, semana, mês e Hoje | Intervalo e eventos corretos em `America/Fortaleza` | Automático + exploratório | P1 |
| AGD-08 | Inspetor tenta gerenciar compromisso | Interface somente leitura e API retorna 403 | Automático | P0 |

### 6.5 Avisos

| ID | Cenário | Resultado esperado | Tipo | Prioridade |
| --- | --- | --- | --- | --- |
| AVS-01 | Gestor publica aviso geral | Todos os integrantes autorizados recebem o aviso | Automático + integrado | P0 |
| AVS-02 | Publicar aviso direcionado | Somente destinatários selecionados visualizam | Automático | P0 |
| AVS-03 | Aviso futuro, expirado ou cancelado | Não aparece no feed ativo | Automático | P1 |
| AVS-04 | Editar aviso já lido | Nova versão volta a exigir leitura | Automático + integrado | P1 |
| AVS-05 | Abrir e confirmar leitura | Estado persiste após atualizar e entrar novamente | Automático + integrado | P1 |
| AVS-06 | Inspetor tenta publicar, editar ou cancelar | Ações ausentes e API retorna 403 | Automático | P0 |
| AVS-07 | Usuário de outra equipe acessa o detalhe | Resposta 404 e conteúdo não exposto | Automático | P0 |

### 6.6 Qualidade transversal

| ID | Cenário | Resultado esperado | Tipo | Prioridade |
| --- | --- | --- | --- | --- |
| QLT-01 | Teclado em login, menus, formulários e diálogos | Ordem de foco lógica, foco visível e retorno ao acionador | Automático + exploratório | P1 |
| QLT-02 | Axe nas páginas principais | Nenhuma violação séria ou crítica | Automático | P1 |
| QLT-03 | Larguras de 390 px e 1366 px | Sem rolagem horizontal ou ação inacessível | Automático + visual | P1 |
| QLT-04 | API indisponível ou resposta 500 | Mensagem útil e opção de tentar novamente | Automático + integrado | P1 |
| QLT-05 | Duplo clique em ações de escrita | Apenas uma operação persistida | Integrado | P1 |
| QLT-06 | Massa de 1.000 demandas | Listagem paginada mantém tempo aceitável e consultas controladas | Backend/performance | P2 |

## 7. Roteiro de smoke test

Executar antes de cada demonstração ou entrega:

1. Entrar como gestor.
2. Criar uma demanda fictícia e atribuí-la a um inspetor.
3. Anexar uma evidência válida.
4. Criar um compromisso para o inspetor.
5. Publicar um aviso direcionado.
6. Sair e entrar como inspetor.
7. Aceitar, iniciar e enviar a demanda para avaliação.
8. Confirmar o compromisso, o aviso e o anexo.
9. Sair e entrar como gestor.
10. Aprovar a demanda e conferir todo o histórico.

Se qualquer passo falhar, a versão não está pronta para demonstração.

## 8. Execução local

### Backend

```powershell
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py test
```

### Frontend

```powershell
cd frontend
npm ci
npm run typecheck
npm run lint
npm run build
npm test
```

### Extensão demonstrativa

```powershell
cd extension-sei
npm test
```

Para a bateria integrada, iniciar PostgreSQL e Django em `127.0.0.1:8000`,
iniciar o frontend em `127.0.0.1:3000` e executar um projeto Playwright separado
sem `instalarApi`. A massa deve ser recriada ou identificada por execução para
que o teste possa ser repetido.

## 9. Registro de defeitos

Cada defeito deve conter:

- identificador e título objetivo;
- ambiente, perfil e equipe utilizados;
- pré-condições e massa de teste;
- passos mínimos para reproduzir;
- resultado obtido e resultado esperado;
- prioridade P0–P3;
- captura, vídeo, resposta da API ou log sem dados sensíveis;
- responsável, estado e versão da correção;
- evidência do reteste e da regressão relacionada.

Fluxo recomendado: `Aberto → Em análise → Em correção → Pronto para reteste →
Concluído`. Um defeito reprovado no reteste retorna para `Em correção`.

## 10. Divisão do trabalho de QA

- **QA responsável:** mantém a matriz, prepara a massa, executa smoke,
  exploratório e retestes.
- **Pessoa desenvolvedora:** escreve testes de backend/interface da própria
  alteração e entrega instruções reproduzíveis.
- **Revisor:** verifica regra, segurança e risco de regressão no pull request.
- **Tech Lead:** decide prioridade, bloqueia entregas com P0/P1 e garante tempo
  para correções.
- **Product Owner/representante da VISAT:** valida regras de negócio e executa o
  aceite dos fluxos, sem assumir testes técnicos.

## 11. Critério de saída

Uma versão pode ser apresentada quando:

- testes Django, Playwright, extensão, tipos, lint e build passam;
- o smoke integrado passa com PostgreSQL real;
- os cenários P0 e P1 foram executados na versão candidata;
- não existem defeitos P0 ou P1 abertos;
- evidências estão vinculadas à versão ou ao commit testado;
- limitações conhecidas estão registradas e não comprometem o núcleo do MVP.

## 12. Próximas tarefas

- [ ] Criar uma suíte `frontend/tests/integracao/` sem API simulada.
- [ ] Automatizar primeiro DEM-01 a DEM-06 como fluxo integrado principal.
- [ ] Adicionar ANX-01/04, AGD-01 e AVS-01 ao smoke integrado.
- [ ] Preparar massa idempotente exclusiva para QA.
- [ ] Criar modelo de cartão de defeito no Trello.
- [ ] Registrar execução por commit, ambiente e data.
