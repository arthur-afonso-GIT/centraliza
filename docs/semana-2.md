# Plano de execução — listagem de demandas

Período: **07/09 a 13/09**. Meta: substituir a página provisória de Demandas
por uma listagem integrada à API Python e ao PostgreSQL, com segmentos
Pendentes, Em andamento e Críticas, cartões e paginação.

## Ponto de partida

Já existem layout responsivo, navegação, paleta, sessão fictícia, testes e
Graphify. Ainda não existem back-end, banco conectado nem autenticação real.
Por isso, preparar a API e a identidade de teste é uma dependência explícita
desta entrega, não uma integração que já está pronta.

## Metas e tarefas

| ID | Tarefa | Responsável por frente | Depende de | Entrega verificável |
| --- | --- | --- | --- | --- |
| S2-01 | Definir regras e contrato da lista | Produto + back-end + front-end | — | Campos, segmentos, acesso e formato da resposta documentados |
| S2-02 | Prototipar lista e cartões | Design | S2-01 | Desktop/celular, seleção de segmento, paginação, vazio, carregamento e erro |
| S2-03 | Preparar Django, PostgreSQL e modelos | Back-end | S2-01 | Ambiente executável, migrações e dados fictícios reproduzíveis |
| S2-04 | Implementar acesso e endpoint paginado | Back-end | S2-03 | Listagem filtrada por usuário, status e criticidade, com testes de isolamento |
| S2-05 | Construir a listagem React | Front-end | S2-01 e S2-02 | Cartões, segmentos e estados usando um adaptador de dados |
| S2-06 | Integrar front-end e API | Front-end + back-end | S2-04 e S2-05 | Dados do PostgreSQL apresentados conforme o usuário autenticado |
| S2-07 | Validar e documentar a entrega | QA + equipe | S2-06 | Testes, evidências, medição de desempenho e instruções atualizadas |

As frentes indicam responsabilidades; distribuir os nomes na reunião da equipe.
Situação da execução: S2-01 concluída com o [contrato de implementação](contrato-demandas.md);
S2-03 concluída com Django, migrações, PostgreSQL local e carga fictícia.
S2-04 concluída com sessão, filtros, paginação e isolamento por equipe.
S2-05 concluída com listagem React ligada a fixtures do contrato, segmentos
operáveis por teclado, paginação e estados de carregamento, vazio e erro.
As demais tarefas permanecem planejadas. A revisão de
produto pela equipe continua distinta da definição técnica implementada.

## Cronograma diário

| Data | Prioridade | Resultado do dia |
| --- | --- | --- |
| Seg. 07/09 | S2-01 e início de S2-02 | Fechar contrato e regras; rascunhar lista e cartão |
| Ter. 08/09 | S2-02 e S2-03 | Protótipo revisado; Django/PostgreSQL com migrações e massa fictícia |
| Qua. 09/09 | S2-04 e S2-05 | Endpoint com filtros e paginação; interface funcionando com fixtures do mesmo contrato |
| Qui. 10/09 | S2-06 | Primeiro fluxo real: autenticar, abrir lista, trocar segmento e paginar |
| Sex. 11/09 | S2-07 | Validar permissões, combinações de filtros e estados da interface |
| Sáb. 12/09 | Correções e desempenho | Medir com massa pequena/média e corrigir problemas encontrados |
| Dom. 13/09 | Reserva e apresentação | Conferir checklist, documentação, Graphify e demonstração final |

Design e front-end podem avançar enquanto a API é construída. As fixtures
devem seguir o contrato acordado e continuar identificadas como simulação.
A tarefa de integração só termina quando a tela usa a API e o PostgreSQL.

## Regras propostas para alinhar na segunda-feira

- **Pendentes:** demandas com status `pendente`.
- **Em andamento:** demandas com status `em_andamento`.
- **Críticas:** demandas ativas com `critica=true`, independentemente de
  estarem pendentes ou em andamento. Portanto, os segmentos podem se sobrepor.
- Criticidade é um campo booleano separado de status e prioridade. Nesta
  entrega não será inferida automaticamente do prazo ou da prioridade.
- Concluídas e canceladas não aparecem na lista operacional desta entrega.
- Gestor consulta demandas da sua equipe; inspetor consulta somente as suas
  demandas atribuídas, dentro da equipe. A API aplica esse recorte antes de
  filtrar, contar ou paginar.
- Ordenação inicial: prazo crescente, seguido de ID para desempate estável.
- Ao mudar de segmento, a página volta para 1. A interface descarta respostas
  antigas para que uma requisição lenta não sobrescreva o segmento atual.

## Modelo mínimo

| Entidade | Campos/relações necessários |
| --- | --- |
| Equipe | ID e nome |
| Usuário | Identidade autenticada, nome, perfil e equipe |
| Demanda | ID, título, descrição, status, prioridade, prazo, crítica, equipe, criador, responsável, criação e atualização |

Usar relações do banco para equipe, criador e responsável. O responsável pode
estar vazio: nesse caso, o cartão informa “Não atribuída”, e a demanda aparece
apenas para a gestão da equipe. Criador e responsável devem pertencer à equipe
da demanda. Preparar registros de diferentes equipes para testar isolamento.

Os dados serão criados por comando de carga fictícia ou administração de
desenvolvimento. Cadastro e edição de demandas pela interface ficam fora do escopo.

## Contrato inicial da API

Endpoint de leitura: `GET /api/demandas/`.

| Parâmetro | Regra |
| --- | --- |
| `status` | Opcional: `pendente` ou `em_andamento` |
| `critica` | Opcional: `true` ou `false` |
| `page` | Inteiro positivo; padrão 1 |
| `page_size` | Padrão 20; permitido de 1 a 50 |

Sem filtros, retornar somente demandas ativas permitidas ao usuário.
Quando status e criticidade forem enviados juntos, aplicar ambos.

Exemplos de chamadas da interface:

```text
/api/demandas/?status=pendente&page=1&page_size=20
/api/demandas/?status=em_andamento&page=1&page_size=20
/api/demandas/?critica=true&page=1&page_size=20
```

Resposta proposta:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 42,
      "titulo": "Inspeção em estabelecimento de exemplo",
      "status": "pendente",
      "prioridade": "alta",
      "prazo": "2026-09-15",
      "critica": true,
      "responsavel": { "id": 7, "nome": "Inspetor de teste" }
    }
  ]
}
```

`count` representa o resultado autorizado e filtrado, não o total da equipe
quando o usuário é inspetor. Lista vazia retorna 200 com `results: []`.
Parâmetro inválido retorna 400; ausência de sessão, 401; página fora do intervalo,
404. Implementar e testar esses comportamentos explicitamente.

### Identidade e integração

Preparar autenticação por sessão do Django, usando contas fictícias previamente
criadas, e adaptar o contrato de entrada/consulta/saída já documentado.
Usar cookie HttpOnly e proteção CSRF nas operações de sessão. Configurar um
proxy de desenvolvimento para `/api`, mantendo chamadas de mesma origem.

O seletor fictício atual não é prova de identidade para a API: nunca aceitar
perfil, equipe ou ID de usuário enviados pelo navegador como autorização.
Não incluir cadastro público, recuperação de senha ou gestão de contas nesta etapa.
A validação principal será local; a hospedagem atual da demonstração não possui
um servidor Python conectado. Publicação integrada será uma tarefa separada.

## Conteúdo e estados da interface

O cartão apresenta título, status, prioridade, prazo, responsável e um marcador
textual de criticidade. Usar a paleta aprovada; não depender somente de cores.
Não adicionar botões de edição ou de detalhes sem uma tela funcional correspondente.

- Segmentos operáveis por teclado, com seleção anunciada.
- Carregamento sem exibir dados do segmento anterior como se fossem atuais.
- Mensagem vazia específica por segmento, sem sugerir falha da aplicação.
- Erro com opção de tentar novamente e tratamento de sessão expirada.
- Paginação com anterior/próxima, página atual e total de resultados do filtro.
- Desktop e celular sem cortes ou rolagem horizontal.

## Testes e desempenho

Cobrir no back-end: acesso de cada perfil/equipe, ausência de sessão, demanda
sem responsável, combinações de status/criticidade, estados inativos, parâmetros
inválidos, lista vazia, limites de página e ordenação estável.

Cobrir na interface: mudança de segmento, reset da página, paginação, cartões,
vazio, carregamento, erro/repetição, sessão expirada, respostas fora de ordem,
teclado e responsividade. Preservar os testes existentes de navegação.

Usar duas massas reproduzíveis: **30 e 1.000 demandas**, distribuídas entre
equipes, responsáveis e estados. Confirmar que o navegador recebe no máximo
o tamanho da página, sem baixar toda a base para filtrar localmente.

Meta inicial de referência: p95 da API abaixo de 500 ms com 1.000 registros,
em execução local sem concorrência. Medir 30 requisições após 5 de aquecimento
e registrar máquina, ambiente e resultado. Esse valor é uma meta proposta,
não uma garantia de produção. Verificar consultas por página para evitar
uma consulta adicional por cartão; criar índices conforme filtros e medição.

## Critérios de conclusão

- [ ] Protótipo e regras revisados pela equipe.
- [x] Banco e dados fictícios podem ser preparados seguindo a documentação.
- [x] API pagina e filtra corretamente, sem vazamento entre usuários/equipes.
- [ ] Os três segmentos exibem dados reais da API.
- [x] Cartões e estados vazio/carregamento/erro estão implementados.
- [ ] Testes de acesso, filtros, paginação e interface passaram.
- [ ] Desempenho foi medido com as duas massas e limitações registradas.
- [x] Graphify atualizado após alterações de código.
- [ ] Cada tarefa concluída possui commit com título e descrição em português.
- [ ] README descreve o produto atual, sem seções organizadas por semana.

## Fora do escopo e contingência

Não implementar criação/edição pela interface, transições de execução,
aprovação, anexos, notificações, calendário, chat ou indicadores nesta entrega.

Se o prazo apertar, simplificar o refinamento visual e recursos opcionais do
cartão. Preservar integração real, controle de acesso e paginação. Se essas
dependências não estiverem prontas, registrar a entrega como parcial, com a
simulação identificada, sem declarar a integração concluída.
