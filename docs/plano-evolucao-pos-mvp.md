# Plano de evolução pós-MVP — Centraliza

## Objetivo

Evoluir o MVP operacional para uma versão de homologação capaz de reduzir a
digitação de dados do SEI, oferecer experiências específicas para gestores e
inspetores, administrar equipes e apoiar o acompanhamento diário da VISAT.

O plano não depende de acesso direto aos Web Services do SEI. A entrada começa
por texto copiado e confirmado pelo usuário. Depois, uma extensão de navegador
poderá alimentar a mesma prévia sem armazenar credenciais nem gravar dados sem
confirmação.

## Decisões de produto

1. O Centraliza mantém um identificador interno próprio; o número do processo
   SEI é um identificador externo pesquisável e sujeito a validação.
2. Nenhuma captura cria ou altera uma demanda sem prévia e confirmação humana.
3. Dados importados passam por uma área temporária antes de chegar às tabelas
   operacionais.
4. Campos internos, como responsável, prioridade, criticidade, prazo
   operacional e status, não são sobrescritos por nova captura.
5. O primeiro mecanismo será colar e interpretar texto. A extensão reutilizará
   os mesmos endpoints, validações e tela de confirmação.
6. A extensão não acessará senha, cookie ou documento do SEI e funcionará apenas
   em endereços institucionais previamente autorizados.
7. Chat, automações decisórias e sincronização bidirecional com o SEI não fazem
   parte desta fase.

## Escopo priorizado

| Prioridade | Capacidade | Resultado esperado |
| --- | --- | --- |
| Essencial | Número do SEI | Localização e prevenção de duplicidade |
| Essencial | Colar, interpretar e confirmar | Menos digitação sem depender de integração externa |
| Essencial | Administração de equipes e contas | Gestão de acesso sem operação direta no banco |
| Essencial | Home por perfil | Gestor e inspetor começam pelas pendências relevantes |
| Essencial | Prazos e central de alertas | Atrasos, correções e avaliações ficam visíveis |
| Essencial | Inspeção estruturada | Execução deixa de depender somente de comentários |
| Importante | Pesquisa avançada | Consulta por SEI, equipe, responsável, origem e período |
| Importante | Captura assistida no navegador | Preenchimento da prévia a partir do processo aberto |
| Importante | Auditoria administrativa | Rastreabilidade de acesso, importações e alterações |
| Importante | Relatórios operacionais | Apoio à gestão sem planilhas paralelas |
| Posterior | Notificações externas | E-mail ou outro canal após regras e consentimentos |
| Posterior | Modelos de documentos | Pareceres e relatórios gerados a partir das demandas |
| Posterior | Integração direta com o SEI | Somente se houver autorização e serviço disponível |
| Posterior | Chat | Somente após validação da necessidade operacional |

## Fluxo de entrada do SEI

```text
Texto colado ─────────────┐
                         │
Extensão do navegador ───┼──► Importação temporária
                         │          │
Arquivo, futuramente ────┘          ▼
                              Normalização
                                   │
                       Validação e duplicidade
                                   │
                                   ▼
                          Prévia para revisão
                             │           │
                          Corrigir     Descartar
                             │
                             ▼
                          Confirmar
                             │
                             ▼
                    Demanda + evento auditável
```

## Modelo de dados preliminar

### Demanda

Adicionar, após validar o formato real utilizado pela instituição:

- `sei_numero`: apresentação do número para o usuário;
- `sei_numero_normalizado`: valor usado em comparação e busca;
- `sei_id_procedimento`: identificador técnico opcional;
- `sei_link`: endereço opcional e validado;
- `sei_tipo_processo`: metadado opcional;
- `sei_unidade`: metadado opcional;
- `sei_data_autuacao`: metadado opcional;
- `origem_cadastro`: manual, texto copiado, extensão ou importação;
- `ultima_importacao_em`: última confirmação de dados externos.

A unicidade deve considerar o contexto institucional e o número normalizado,
não apenas a pontuação digitada pelo usuário. A regra final depende de confirmar
se equipes diferentes podem trabalhar sobre o mesmo processo.

### Importação temporária

Criar uma entidade separada com:

- usuário e equipe;
- origem da captura;
- conteúdo recebido ou referência segura ao arquivo;
- campos interpretados;
- avisos e erros de validação;
- possível demanda duplicada;
- estado: recebida, validada, confirmada, descartada ou expirada;
- datas de criação, confirmação e expiração.

O conteúdo bruto deve ter retenção curta e não deve armazenar a página completa
do SEI. Somente os campos necessários entram na prévia.

## API planejada

| Método | Endpoint | Responsabilidade |
| --- | --- | --- |
| `POST` | `/api/importacoes/sei/previsualizar/` | Interpretar e validar texto ou campos capturados |
| `GET` | `/api/importacoes/sei/{id}/` | Recuperar prévia autorizada |
| `PATCH` | `/api/importacoes/sei/{id}/` | Corrigir campos antes da confirmação |
| `POST` | `/api/importacoes/sei/{id}/confirmar/` | Criar ou associar a uma demanda |
| `DELETE` | `/api/importacoes/sei/{id}/` | Descartar a prévia |
| `GET` | `/api/demandas/?sei_numero=...` | Buscar demanda pelo número normalizado |
| `GET` | `/api/home/` | Entregar resumo adequado ao perfil conectado |
| `GET/POST` | `/api/equipes/` | Consultar ou administrar equipes conforme permissão |
| `GET/POST` | `/api/usuarios/` | Consultar ou administrar contas conforme permissão |
| `GET` | `/api/alertas/` | Listar pendências derivadas de prazos e estados |
| `GET` | `/api/relatorios/operacional/` | Entregar agregados autorizados da equipe |

Os nomes e formatos são propostas. Cada contrato deve ser documentado e testado
antes da integração com a interface.

## Ciclos de desenvolvimento

Cada ciclo deve produzir uma entrega demonstrável. A duração pode ser de uma ou
duas semanas conforme disponibilidade, sem reduzir testes de permissão,
auditoria ou proteção de dados.

### Ciclo 0 — Descoberta e acordo institucional

**Situação:** em andamento. O inventário inicial, as decisões e as pendências
estão registrados em [descoberta-integracao-sei.md](descoberta-integracao-sei.md).

**Meta:** eliminar suposições antes de alterar o modelo.

1. Identificar a versão e o endereço do SEI utilizado pela VISAT.
2. Obter exemplos anonimizados do cabeçalho copiado de processos diferentes.
3. Confirmar formatos, campos visíveis e variações de tela.
4. Verificar relatórios ou arquivos que usuários já conseguem exportar.
5. Definir quais campos podem ser levados ao Centraliza.
6. Confirmar se um processo pode pertencer a mais de uma equipe.
7. Definir administrador, gestor, inspetor e eventual perfil de consulta.
8. Validar a matriz de responsabilidades e o fluxo de inspeção.

**Aceite:** glossário de campos, amostras anonimizadas, matriz de permissões e
decisão sobre unicidade aprovados pela equipe.

### Ciclo 1 — Identidade SEI e pesquisa

**Situação técnica:** implementado em modo conservador. O número é opcional,
preservado para apresentação e normalizado somente para busca e aviso de
possível duplicidade. A unicidade rígida e o formato definitivo continuam
pendentes de validação institucional.

**Meta:** tornar o processo SEI parte segura da identidade da demanda.

1. Adicionar campos confirmados e migração reversível.
2. Implementar normalização sem alterar o valor apresentado.
3. Criar regra de duplicidade no serviço e no banco.
4. Mostrar número na lista, detalhe e histórico.
5. Permitir busca exata e parcial segura.
6. Atualizar carga fictícia sem utilizar dados institucionais.

**Aceite:** versões pontuadas e não pontuadas do mesmo número não geram duas
demandas; criação manual, edição permitida, busca e autorização possuem testes.

### Ciclo 2 — Colar, interpretar e confirmar

**Situação técnica:** implementado com um parser determinístico para rótulos
fictícios. Prévia temporária, correção, duplicidade, confirmação transacional,
descarte e limpeza do texto bruto estão disponíveis para gestores. O adaptador
da instalação institucional continua pendente das amostras anonimizadas.

**Meta:** reduzir digitação com captura manual assistida.

1. Criar entidade e política de expiração da importação temporária.
2. Implementar parser determinístico para os exemplos aprovados.
3. Diferenciar campo ausente, inválido e não reconhecido.
4. Criar endpoint de prévia sem gravação operacional.
5. Construir tela para colar, revisar, corrigir e descartar.
6. Detectar demandas existentes e oferecer abertura, sem duplicação.
7. Confirmar em transação e registrar autor, origem e campos aceitos.
8. Não registrar conteúdo bruto em logs de aplicação.

**Aceite:** colar a mesma informação duas vezes nunca duplica a demanda; nenhum
dado entra no fluxo operacional antes da confirmação; falhas são compreensíveis
e não expõem conteúdo sensível.

### Ciclo 3 — Administração de equipes e usuários

**Meta:** retirar a gestão cotidiana de acessos do banco de dados.

1. Validar se será criado um perfil administrador ou uma permissão específica.
2. Listar integrantes e situação da conta.
3. Criar, editar, ativar e desativar contas com auditoria.
4. Definir perfil e equipe dentro das regras aprovadas.
5. Bloquear remoção destrutiva de usuários com histórico.
6. Definir tratamento de demandas e compromissos ao desativar ou transferir.
7. Criar recuperação de acesso administrada ou institucional.

**Aceite:** uma pessoa autorizada administra a equipe pela interface; usuário
desativado perde novas sessões; registros históricos continuam íntegros.

### Ciclo 4 — Home por perfil, prazos e alertas

**Meta:** transformar a Home em ponto de decisão diário.

Para o gestor:

- demandas vencidas, críticas, sem responsável e aguardando avaliação;
- distribuição e carga por inspetor;
- próximos compromissos e avisos ativos.

Para o inspetor:

- próximas entregas, atrasos e correções solicitadas;
- demandas ainda não iniciadas;
- compromissos e avisos direcionados.

Implementar agregações no backend, evitando reproduzir regras no React. Alertas
iniciais serão internos e derivados dos dados existentes, sem serviço em tempo
real.

**Aceite:** os dois perfis recebem resumos diferentes, coerentes com as próprias
permissões, datas e equipe; os números abrem listas com os mesmos filtros.

### Ciclo 5 — Execução estruturada da inspeção

**Meta:** complementar comentários e anexos com dados operacionais consistentes.

1. Validar um formulário mínimo com inspetores e gestores.
2. Registrar data, local, participantes, observações, achados e providências.
3. Adicionar checklist somente se houver um modelo institucional aprovado.
4. Versionar revisões enviadas para avaliação sem apagar a anterior.
5. Exigir os campos acordados antes do envio à gestão.
6. Integrar os novos eventos à timeline da demanda.

**Aceite:** o inspetor registra e revisa a execução; o gestor compara o que foi
enviado e devolvido; nenhuma correção apaga evidência ou versão anterior.

### Ciclo 6 — Pesquisa e visão operacional

**Meta:** localizar trabalho sem controles paralelos.

1. Pesquisar por número SEI, título, origem e responsável.
2. Combinar equipe, status, prioridade, criticidade, prazo e atraso.
3. Incluir visão autorizada de concluídas e canceladas.
4. Preservar filtros na URL.
5. Permitir filtros salvos somente após validar sua utilidade.
6. Criar exportação CSV com colunas e permissões explícitas.

**Aceite:** resultados, totais e exportações respeitam os mesmos filtros e
permissões; consultas permanecem paginadas e têm desempenho medido.

### Ciclo 7 — Extensão de captura assistida

**Meta:** preencher a prévia a partir de um processo já aberto pelo usuário.

1. Obter autorização para o protótipo e definir domínios permitidos.
2. Criar uma prova de conceito que apenas exiba os campos capturados.
3. Usar seletores específicos, versionados e cobertos por páginas anonimizadas.
4. Detectar campo ausente e mudança incompatível da página.
5. Enviar somente campos permitidos ao endpoint de prévia.
6. Exigir sessão válida no Centraliza e confirmação na interface.
7. Não capturar senha, cookie, documentos ou a página inteira.
8. Definir distribuição, atualização e desativação da extensão.

**Aceite:** um processo aberto gera a mesma prévia do texto colado; alteração
da página falha de forma segura; nenhum dado é enviado sem ação explícita.

### Ciclo 8 — Auditoria e relatórios

**Meta:** apoiar acompanhamento e prestação de contas.

1. Separar timeline operacional de log administrativo e de segurança.
2. Auditar importações, administração de contas, exportações e downloads.
3. Não registrar senhas nem conteúdo integral de documentos.
4. Criar indicadores de volume, prazo, etapa, origem e correções.
5. Documentar definição, período e limitações de cada indicador.
6. Exportar apenas dados autorizados e registrar a exportação.

**Aceite:** cada indicador pode ser reconciliado com uma consulta operacional;
ações sensíveis têm autor e horário; usuários não acessam auditoria de outra
equipe sem permissão específica.

### Ciclo 9 — Homologação e endurecimento

**Meta:** preparar uso controlado com usuários reais.

1. Publicar ambiente de homologação com HTTPS e segredos externos ao código.
2. Configurar armazenamento persistente, backup e restauração testada.
3. Definir retenção para anexos, importações e logs.
4. Implementar limites de login e revisão de dependências.
5. Adicionar monitoramento de disponibilidade e falhas da aplicação.
6. Executar teste orientado com gestor e inspetor.
7. Corrigir bloqueadores e registrar aceite ou pendências.
8. Revisar privacidade, base legal e regras institucionais antes de dados reais.

**Aceite:** roteiro principal funciona em homologação, restauração é comprovada,
permissões são aceitas pela instituição e nenhum defeito crítico permanece.

## Dependências entre ciclos

```text
Ciclo 0
  ├──► Ciclo 1 ──► Ciclo 2 ──► Ciclo 7
  ├──► Ciclo 3 ──► Ciclo 4
  └──► Ciclo 5 ──► Ciclo 6 ──► Ciclo 8

Ciclos 1–8 ──► Ciclo 9
```

Os ciclos 3 e 5 podem começar após a descoberta mesmo se o parser ainda estiver
em construção. A extensão depende da prévia estável do Ciclo 2. Relatórios
dependem de regras e campos estabilizados para não consolidar métricas erradas.

## Estratégia de testes

Cada ciclo deve cobrir:

- unidade e normalização de dados;
- serviço de negócio e transações;
- permissões por perfil, equipe e responsabilidade;
- tentativa de acesso a dados de outra equipe;
- contrato HTTP e respostas de erro;
- integração React, Django e PostgreSQL;
- navegação por teclado, foco, contraste e layout em 390 e 1366 px;
- regressão de login, demandas, agenda, avisos e anexos;
- massa exclusivamente fictícia.

Para a captura, manter exemplos HTML anonimizados por versão suportada. O teste
deve falhar quando um campo obrigatório deixa de ser encontrado, em vez de
retornar dados parcialmente incorretos.

## Definição de pronto

Uma entrega somente está pronta quando:

- regra e critério de aceite foram validados antes do código;
- migração possui estratégia de reversão e dados existentes foram preservados;
- backend é a fonte das regras de permissão e estado;
- sucesso, vazio, erro, conflito e repetição têm tratamento na interface;
- ação relevante produz histórico ou auditoria apropriada;
- testes pertinentes, lint, tipos e build passam;
- documentação, carga fictícia e Graphify foram atualizados;
- limitação conhecida foi registrada sem apresentar planejamento como recurso
  já disponível.

## Riscos e respostas

| Risco | Resposta planejada |
| --- | --- |
| Estrutura da página do SEI mudar | Extratores versionados, testes anonimizados e falha segura |
| Número duplicado com pontuação diferente | Normalização e restrição de unicidade no banco |
| Importação sobrescrever trabalho interno | Autoridade de campos e confirmação explícita |
| Captura de conteúdo excessivo | Lista permitida de campos e descarte do conteúdo bruto |
| Extensão obter permissões amplas | Restringir domínios e revisar manifesto institucionalmente |
| Métricas divergirem da operação | Definição documentada e reconciliação com listagens |
| Administração causar perda de acesso | Desativação lógica e tratamento de responsabilidades abertas |
| Escopo crescer antes da homologação | Manter itens posteriores fora dos ciclos essenciais |

## Backlog posterior

Somente reavaliar depois da homologação:

1. Confirmação de leitura de avisos.
2. Recorrência e integração externa de calendário.
3. Notificações por e-mail ou outro canal institucional.
4. Modelos e geração de pareceres e relatórios.
5. Consulta direta aos Web Services do SEI, se autorizada.
6. Sincronização periódica e, posteriormente, operações de escrita.
7. Aplicativo móvel ou modo offline.
8. Chat individual ou de equipe.
9. Automação ou IA, apenas para necessidades e dados formalmente aprovados.

## Próxima ação

Executar o Ciclo 0. A equipe deve fornecer exemplos anonimizados de texto
copiado do SEI e decidir a unicidade do processo, os campos permitidos e a
matriz de perfis. Com essas decisões registradas, iniciar o Ciclo 1 pelo modelo,
normalização e testes do número do SEI.
