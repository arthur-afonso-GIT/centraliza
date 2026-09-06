# Plano de execução — detalhe e histórico da demanda

Período: **14/09 a 20/09**. Meta: permitir que uma pessoa autorizada abra uma
demanda da lista, consulte seus dados e histórico, altere o status permitido e
veja a mudança refletida imediatamente no detalhe e na listagem.

## Ponto de partida

O sistema já possui autenticação por sessão, isolamento por equipe e perfil,
listagem paginada com filtros, PostgreSQL e testes. A nova entrega deve reutilizar
as mesmas regras de acesso: o gestor consulta demandas da própria equipe e o
inspetor somente demandas atribuídas a ele.

## Metas e tarefas

| ID | Tarefa | Frente | Depende de | Entrega verificável |
| --- | --- | --- | --- | --- |
| S3-01 | Definir contrato, transições e conteúdo do histórico | Produto + design + back-end | — | Regras e exemplos revisados antes da implementação |
| S3-02 | Prototipar detalhe responsivo | Design | S3-01 | Tela em desktop e celular com dados, ação de status, timeline e todos os estados |
| S3-03 | Modelar eventos e criar migração | Back-end | S3-01 | Histórico imutável relacionado à demanda, autor e data |
| S3-04 | Implementar detalhe, mudança de status e comentário | Back-end | S3-03 | Endpoints transacionais, autorizados e cobertos por testes |
| S3-05 | Criar página de detalhe e timeline | Front-end | S3-02 | Rota acessível a partir do cartão, loader, erro, vazio e histórico ordenado |
| S3-06 | Integrar alteração de status | Front-end + back-end | S3-04 e S3-05 | Feedback durante a ação, mensagem de sucesso/erro e lista atualizada ao voltar |
| S3-07 | Validar e documentar | QA + equipe | S3-06 | Fluxo ponta a ponta, consistência do histórico, acessibilidade e Graphify atualizados |

## Cronograma diário

| Data | Prioridade | Resultado esperado |
| --- | --- | --- |
| Seg. 14/09 | S3-01 | Fechar campos do detalhe, transições, permissões e eventos |
| Ter. 15/09 | S3-02 e S3-03 | Protótipo revisável e migração do histórico pronta |
| Qua. 16/09 | S3-04 | API de detalhe, status e comentário com testes de acesso |
| Qui. 17/09 | S3-05 | Página responsiva ligada inicialmente ao contrato da API |
| Sex. 18/09 | S3-06 | Fluxo integrado da lista ao detalhe e retorno com dados atualizados |
| Sáb. 19/09 | S3-07 | Testes completos, acessibilidade, correções e evidências |
| Dom. 20/09 | Reserva | Revisão da equipe, documentação, Graphify e apresentação |

## Decisões de escopo propostas

- Usar uma página em `/demandas/{id}` em vez de modal. Isso permite link direto,
  botão Voltar previsível, melhor espaço no celular e foco mais simples.
- Exibir título, descrição, status, prazo, prioridade, criticidade, responsável,
  data de criação e última atualização.
- Nesta entrega, permitir apenas `pendente → em_andamento` e
  `em_andamento → concluida`. Cancelamento, reabertura, aprovação e correção
  ficam para o fluxo de gestão posterior.
- O inspetor altera apenas demandas atribuídas a ele. O gestor consulta o
  detalhe da equipe, mas não executa uma demanda em nome do inspetor.
- Uma mudança para o mesmo status deve ser rejeitada e não gerar evento.
- Comentário é texto simples, obrigatório, com no máximo 2.000 caracteres.
- Histórico é somente leitura pela API: eventos não podem ser editados ou
  excluídos por usuários da aplicação.

Essas regras precisam de validação do grupo e da pessoa responsável pelo produto
antes de serem tratadas como regra definitiva da VISAT.

## Modelo do histórico

Criar `EventoDemanda` com:

| Campo | Uso |
| --- | --- |
| `demanda` | Relação com a demanda |
| `tipo` | `status_alterado` ou `comentario` |
| `autor` | Usuário autenticado que realizou a ação |
| `criado_em` | Data e hora geradas pelo servidor |
| `status_anterior` | Preenchido em mudança de status |
| `status_novo` | Preenchido em mudança de status |
| `texto` | Comentário simples; vazio no evento automático de status |

Ordenar eventos do mais recente para o mais antigo na resposta. Criar índice por
`demanda` e `criado_em`. Ao atualizar status, salvar a demanda e o evento na
mesma transação para impedir mudança sem registro correspondente.

## Contrato inicial da API

### Consultar detalhe

`GET /api/demandas/{id}/`

Retorna os campos completos e `historico`. Demanda fora do recorte autorizado
deve responder 404 para não revelar que o registro existe.

### Alterar status

`PATCH /api/demandas/{id}/status/`

```json
{ "status": "em_andamento" }
```

Retorna o detalhe atualizado com o novo evento. Status ou transição inválida
retorna 400; ausência de sessão retorna 401; registro não autorizado retorna 404.

### Adicionar comentário

`POST /api/demandas/{id}/historico/`

```json
{ "texto": "Contato inicial realizado com o estabelecimento." }
```

Retorna 201 com o evento criado. Texto vazio ou acima do limite retorna 400.
O servidor define autor, data e tipo; o navegador não envia esses campos.

## Comportamento da interface

- O cartão inteiro ou um link “Ver detalhes” abre a página correspondente.
- Enquanto carrega, preservar título da página e anunciar o estado.
- Erro de rede oferece nova tentativa; 404 apresenta mensagem de indisponibilidade;
  401 encaminha para o login.
- A timeline contém tipo, autor, data/hora e descrição textual do evento.
- A ação de status mostra somente a próxima transição permitida.
- Durante a atualização, desabilitar a ação e mostrar loader sem duplicar envios.
- Após sucesso, atualizar cabeçalho e timeline e anunciar a confirmação em um
  toast com `aria-live`. Em erro, manter o status anterior e permitir nova tentativa.
- Ao voltar à lista, buscar novamente os dados. Uma demanda concluída deve sair
  dos segmentos operacionais; uma iniciada deve mudar de Pendentes para Em andamento.

## Testes

### Back-end

- Gestor consulta somente detalhe da própria equipe.
- Inspetor consulta e altera somente demanda atribuída a ele.
- Usuário sem acesso recebe 404 e nenhum dado do registro.
- Transições válidas criam exatamente um evento com autor e estados corretos.
- Transições inválidas e status repetido não alteram demanda nem histórico.
- Falha durante a operação reverte demanda e evento pela transação.
- Comentário válido é persistido; vazio e acima do limite são rejeitados.
- Histórico mantém ordem estável e não oferece edição ou exclusão.

### Front-end e fluxo integrado

- Abrir cartão leva ao detalhe correto e o botão Voltar retorna à lista.
- Loader, vazio do histórico, erro, 404 e sessão expirada são compreensíveis.
- Alterar status mostra progresso, confirmação e novo evento.
- Ao retornar, a demanda aparece no segmento correspondente ou deixa a lista.
- Clique repetido não produz duas requisições.
- Página e timeline funcionam por teclado, sem rolagem horizontal em 390 e
  1366 px e sem violações Axe nas regras já adotadas.

## Critérios de conclusão

- [ ] Contrato e transições revisados pela equipe.
- [ ] Protótipo de detalhe e timeline revisado em desktop e celular.
- [x] Migração do histórico reproduzível em banco vazio.
- [x] API protege detalhe e alterações conforme equipe, perfil e responsável.
- [x] Mudança de status e evento são salvos atomicamente.
- [ ] Página apresenta dados reais e histórico do PostgreSQL.
- [ ] Feedback de carregamento, sucesso, erro, 404 e sessão expirada implementado.
- [ ] Fluxo “abrir → alterar status → voltar à lista” aprovado.
- [ ] Testes do backend e frontend, lint, tipos e build aprovados.
- [ ] Documentação e Graphify atualizados.
- [ ] Cada tarefa concluída possui commit em português com descrição da validação.

## Fora do escopo

Não incluir edição dos demais campos, atribuição, anexos, cancelamento,
reabertura, aprovação do gestor, solicitação de correção, notificações ou
auditoria administrativa. Esses recursos exigem regras próprias e devem entrar
em entregas posteriores sem ampliar esta semana.
