# Plano de desenvolvimento — MVP operacional do Centraliza

## Objetivo

Transformar a versão demonstrável em uma aplicação utilizável no fluxo básico
da VISAT. O núcleo obrigatório será composto por gerenciamento completo de
demandas, anexos protegidos, Agenda gerenciável e publicação de avisos. Chat,
notificações em tempo real e análises avançadas entram somente depois desse
núcleo estar estável.

O plano considera uma equipe acadêmica no início da formação. As etapas reduzem
mudanças simultâneas, reutilizam os padrões já existentes e exigem uma entrega
testável antes de iniciar a próxima.

## Situação atual

| Área | Disponível | Principal lacuna |
| --- | --- | --- |
| Sessão e perfis | Login, logout, gestor, inspetor e equipe | Administração de usuários e recuperação de acesso |
| Demandas | Lista, filtros, detalhe, comentários e duas transições | Criação, atribuição, avaliação, correção e cancelamento |
| Histórico | Eventos de status e comentários | Cobrir todas as ações e proteger eventos contra alteração |
| Agenda | Consulta por dia, semana e mês | Criar, editar, cancelar, associar e detectar conflitos |
| Avisos | Feed categorizado e detalhe | Publicar, editar, cancelar e controlar vigência |
| Anexos | Não disponível | Upload, armazenamento, autorização e download |
| Chat | Página de demonstração | Opcional após o MVP operacional |

## Ordem de execução

Situação técnica: Etapa 1 implementada com seis estados, matriz de transições,
serviço transacional, justificativas obrigatórias e histórico atômico. A matriz
ainda precisa de validação institucional antes de ser considerada definitiva.

### Etapa 1 — Regras e base do fluxo de demandas

**Meta:** fechar o ciclo de vida antes de criar formulários.

1. Validar com a equipe os estados:
   `pendente → em andamento → aguardando avaliação → concluída`.
2. Definir retornos para `correção`, cancelamento e reabertura.
3. Criar uma matriz simples dizendo qual perfil executa cada transição.
4. Acrescentar os estados e motivos necessários ao modelo e à API.
5. Registrar toda transição no histórico com autor, data e justificativa.
6. Bloquear mudança direta no banco pela camada normal da aplicação; usar um
   serviço transacional único para atualizar status e criar o evento.

**Aceite:** testes provam todas as transições permitidas e negadas, incluindo
usuário de outra equipe, demanda sem responsável e tentativa repetida.

### Etapa 2 — Gerenciamento de demandas pelo gestor

**Meta:** permitir que o gestor organize o trabalho sem acessar o Django Admin.

1. Implementar criação com título, descrição, origem, prioridade e prazo.
2. Permitir atribuir e reatribuir somente a inspetores ativos da mesma equipe.
3. Implementar edição dos campos permitidos e cancelamento com motivo.
4. Adicionar filtros por responsável, prazo e situação de atraso.
5. Criar formulários React com validação por campo, feedback de envio e
   proteção contra duplo clique.
6. Mostrar no histórico criação, edição relevante, atribuição, reatribuição e
   cancelamento.

**Aceite:** o gestor cria e atribui uma demanda; o inspetor correto passa a
visualizá-la; uma reatribuição remove o acesso do responsável anterior; todos os
passos aparecem na timeline.

### Etapa 3 — Execução e avaliação da demanda

**Meta:** completar o trabalho entre inspetor e gestor.

1. Inspetor aceita/inicia demanda atribuída e registra andamento.
2. Inspetor envia a atividade para avaliação com um resumo obrigatório.
3. Gestor aprova e conclui ou devolve para correção com justificativa.
4. Inspetor corrige e reenvia sem apagar o ciclo anterior.
5. Exibir ação disponível conforme perfil e estado, em vez de expor todos os
   botões e depender apenas da rejeição da API.
6. Calcular atraso no servidor a partir do prazo e do status, sem campo manual.

**Aceite:** o cenário completo funciona nos dois perfis e permanece consistente
após atualizar a página, voltar à lista e entrar novamente.

### Etapa 4 — Anexos e evidências

**Meta:** permitir evidências básicas sem comprometer segurança ou simplicidade.

1. Começar com PDF, JPEG e PNG, limite inicial de 10 MB por arquivo.
2. Armazenar metadados no PostgreSQL e arquivos fora da pasta pública.
3. Usar nomes internos aleatórios; preservar o nome original apenas como
   metadado para exibição.
4. Validar extensão, MIME, tamanho, demanda e autorização no backend.
5. Permitir upload ao responsável e ao gestor; permitir download somente para
   usuários autorizados da equipe.
6. Registrar inclusão e remoção no histórico; adotar remoção lógica quando a
   evidência precisar permanecer auditável.
7. Criar lista de anexos com progresso, erro individual e repetição.

**Aceite:** arquivo permitido pode ser enviado e baixado pelos usuários certos;
tipo/tamanho inválido e acesso de outra equipe são bloqueados; exclusão não
remove a evidência do histórico.

### Etapa 5 — Agenda gerenciável

**Meta:** transformar o calendário de leitura em ferramenta de planejamento.

1. Gestor cria reunião ou atividade com início, fim e participantes.
2. Gestor edita e cancela; cancelamento preserva registro e autor da ação.
3. Associar compromisso opcionalmente a uma demanda da mesma equipe.
4. Validar participantes ativos da equipe e fim posterior ao início.
5. Detectar sobreposição de horário dos participantes antes de salvar.
6. Permitir que o usuário reconheça o conflito e ajuste o horário; não criar
   resolução automática no MVP.
7. Atualizar o calendário após salvar sem exigir recarregamento completo.

**Aceite:** um compromisso criado aparece no intervalo correto para gestor e
participantes; conflito é informado; edição e cancelamento refletem no
calendário e respeitam `America/Fortaleza`.

### Etapa 6 — Gestão de avisos

**Meta:** permitir comunicação institucional básica pela própria aplicação.

1. Gestor cria aviso urgente ou informativo para a própria equipe.
2. Implementar rascunho, publicação, edição e cancelamento lógico.
3. Adicionar início e fim de vigência opcionais.
4. O feed exibe somente avisos publicados e vigentes.
5. Registrar autor da criação, última edição e cancelamento.
6. Manter o conteúdo como texto simples nesta etapa, evitando editor rico e
   anexos específicos para avisos.

**Aceite:** publicação aparece imediatamente para a equipe, rascunho não
aparece, aviso expirado sai do feed e outro gestor/equipe não consegue alterá-lo.

### Etapa 7 — Painel, estabilização e implantação de homologação

**Meta:** reunir o trabalho do dia e tornar o sistema avaliável por usuários.

1. Criar indicadores derivados: pendentes, em andamento, aguardando avaliação,
   atrasadas e críticas.
2. Exibir próximos compromissos e avisos recentes sem duplicar regras no React.
3. Preparar ambiente de homologação com HTTPS, variáveis seguras e PostgreSQL.
4. Configurar backup do banco e dos anexos e testar uma restauração.
5. Criar logs de erros e de ações sensíveis sem registrar senhas ou conteúdo de
   arquivos.
6. Executar teste com gestores e inspetores, registrar problemas e corrigir os
   bloqueadores.
7. Revisar permissões, dependências, cookies, limites de login e requisitos de
   privacidade antes de usar qualquer dado real.

**Aceite:** a equipe executa o roteiro principal em homologação, os backups são
restauráveis e nenhum defeito crítico permanece aberto.

## Sugestão de ciclos

Cada ciclo pode ocupar uma ou duas semanas conforme a disponibilidade da equipe.

| Ciclo | Entrega principal | Reserva recomendada |
| --- | --- | ---: |
| 1 | Regras, estados e serviço transacional | 20% para ajuste das regras |
| 2 | Criação, edição, atribuição e cancelamento | 20% para formulários e permissões |
| 3 | Execução, avaliação e correção | 25% para regressão do histórico |
| 4 | Anexos protegidos | 30% para armazenamento e segurança |
| 5 | Escrita e conflitos da Agenda | 20% para timezone e sobreposição |
| 6 | Publicação e vigência de avisos | 15% para estados do feed |
| 7 | Painel, homologação e aceite | 30% para correções encontradas pelos usuários |

Se o calendário ficar apertado, reduzir primeiro painel e refinamentos visuais.
Não cortar autorização, histórico, validação de anexos, backup ou testes dos
fluxos principais.

## Padrão de implementação por tarefa

1. Escrever regra e critério de aceite antes do código.
2. Alterar modelo e migração, quando necessário.
3. Implementar serviço/regra de negócio no backend.
4. Expor endpoint autorizado e cobri-lo com teste.
5. Integrar a interface com loading, vazio, erro e sucesso.
6. Testar o fluxo real entre React, Django e PostgreSQL.
7. Atualizar documentação e Graphify.
8. Criar commit pequeno, em português, com validação registrada.

## Definição de pronto

Uma funcionalidade só está pronta quando:

- permissões de gestor, inspetor, equipe e responsável foram testadas;
- ação e falha possuem feedback compreensível na interface;
- alterações relevantes aparecem no histórico;
- dados permanecem corretos após atualizar a página;
- layout funciona em 390 e 1366 px e pode ser usado por teclado;
- testes Django e Playwright pertinentes, lint, tipos e build passam;
- carga fictícia e instruções de demonstração foram atualizadas;
- Graphify e documentação refletem a implementação.

## Backlog posterior ao MVP

Somente iniciar quando as sete etapas anteriores estiverem estáveis:

1. Chat individual e por equipe.
2. Notificações em tempo real.
3. Confirmação de leitura de avisos.
4. Recorrência e integrações externas de calendário.
5. Dashboards analíticos, exportações e relatórios avançados.
6. Aplicativo móvel ou suporte offline.

## Próxima ação recomendada

Começar pela Etapa 1 e produzir uma matriz de transições de demanda aprovada
pela equipe. Em seguida, implementar o serviço transacional e seus testes antes
dos formulários de criação e atribuição.
