# Contrato de listagem de demandas

Decisão iniciada em S2-01 e ampliada pelo MVP operacional. O cadastro ainda não
faz parte desta API; as transições usam um endpoint específico e transacional.

## Acesso e filtros

`GET /api/demandas/` exige sessão autenticada no Django. Gestor acessa demandas
da própria equipe; inspetor acessa as atribuídas a ele nessa equipe. Nunca
usar perfil ou ID enviados pelo cliente como autorização. Sem equipe, negar
acesso. O filtro de acesso também limita o total informado na paginação.

São ativos `pendente`, `em_andamento`, `aguardando_avaliacao` e `em_correcao`.
`concluida` e `cancelada` distinguem registros encerrados e não entram nesta
listagem.
Crítica é uma flag independente. Status e criticidade combinados usam AND.

| Parâmetro | Validação |
| --- | --- |
| status | Opcional: pendente, em_andamento, aguardando_avaliacao ou em_correcao |
| critica | Opcional: true ou false |
| page | Inteiro positivo, padrão 1 |
| page_size | Inteiro de 1 a 50, padrão 20 |

Ordenar por prazo crescente e ID crescente. Retornar `count`, `next`,
`previous` e `results`; cada resultado contém ID, título, status, prioridade,
prazo ISO, flag crítica e responsável `{id, nome}` ou null.

Resposta vazia: 200 com lista vazia; parâmetro inválido: 400; sessão ausente:
401; usuário sem equipe: 403; página fora do intervalo: 404. Página 1 de
uma lista vazia é válida. Não oferecer métodos de escrita em demandas.

## Sessão

- `GET /api/auth/csrf/`: prepara cookie CSRF e devolve token para o cliente.
- `POST /api/auth/login/`: recebe username e password; exige token CSRF.
- `GET /api/auth/me/`: devolve `{id, nome, perfil}` ou 401.
- `POST /api/auth/logout/`: exige token CSRF; invalida sessão e retorna 204.

Usar cookies de sessão HttpOnly e origem única via proxy de desenvolvimento.
Credenciais inválidas retornam mensagem genérica, sem identificar contas.
Contas inativas não entram. Em produção, HTTPS e segredo externo são obrigatórios.

## Transições

`PATCH /api/demandas/{id}/status/` recebe `status` e `texto`. O texto é
obrigatório no envio para avaliação, devolução para correção e cancelamento.
As permissões e origens válidas estão na
[matriz do fluxo operacional](fluxo-demandas.md). A operação bloqueia a linha,
altera a demanda e cria o evento na mesma transação.

## Gerenciamento pelo gestor

`POST /api/demandas/` cria uma demanda com `titulo`, `descricao`, `origem`,
`prioridade`, `prazo`, `critica` e `responsavel_id`. Título e prazo são
obrigatórios. O responsável pode ser nulo ou um inspetor ativo da mesma equipe.

`PATCH /api/demandas/{id}/` atualiza parcialmente esses campos. Demandas
concluídas ou canceladas não aceitam edição. Criação, campos alterados e troca de
responsável geram eventos separados no histórico. Inspetores recebem `403` e
registros de outra equipe permanecem ocultos por `404`.

## Interface

Pendentes envia `status=pendente`, Em andamento envia `status=em_andamento`
e Críticas envia `critica=true`. Ao trocar segmento, voltar à página 1 e
cancelar/ignorar a resposta anterior. Responsável null aparece como “Não atribuída”.
Cartões exibem criticidade em texto, sem depender apenas da cor.
