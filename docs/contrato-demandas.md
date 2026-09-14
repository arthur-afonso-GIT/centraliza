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
| responsavel | ID inteiro positivo; disponível ao gestor |
| prazo_de | Data inicial inclusiva em AAAA-MM-DD |
| prazo_ate | Data final inclusiva em AAAA-MM-DD |
| atrasada | true ou false; compara o prazo com a data local do servidor |
| sei_numero | Até 80 caracteres; busca parcial após normalização tolerante |
| page | Inteiro positivo, padrão 1 |
| page_size | Inteiro de 1 a 50, padrão 20 |

Ordenar por prazo crescente e ID crescente. Retornar `count`, `next`,
`previous` e `results`; cada resultado contém ID, título, status, prioridade,
prazo ISO, número SEI, flag crítica e responsável `{id, nome}` ou null.

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

`POST /api/demandas/` cria uma demanda com `titulo`, `sei_numero`, `descricao`, `origem`,
`prioridade`, `prazo`, `critica` e `responsavel_id`. Título e prazo são
obrigatórios. O responsável pode ser nulo ou um inspetor ativo da mesma equipe.

`PATCH /api/demandas/{id}/` atualiza parcialmente esses campos. Demandas
concluídas ou canceladas não aceitam edição. Criação, campos alterados e troca de
responsável geram eventos separados no histórico. Inspetores recebem `403` e
registros de outra equipe permanecem ocultos por `404`.

`sei_numero` é opcional e preserva o valor informado, removendo apenas espaços
nas extremidades. `sei_numero_normalizado` mantém letras e números em caixa alta
para comparação e busca, sem presumir o formato institucional. A versão atual
avisa possíveis duplicidades, mas não as bloqueia até que a regra entre equipes
seja validada.

`GET /api/demandas/verificar-sei/?sei_numero=...` retorna até dez correspondências
exatas após normalização, sempre limitadas pelas permissões de equipe e
responsabilidade. A consulta não confirma que os registros representam uma
duplicidade real; a decisão continua com o gestor nesta etapa.

`GET /api/usuarios/inspetores/` fornece ao gestor os inspetores ativos da sua
equipe para os campos de atribuição. Inspetores e usuários sem equipe não podem
consultar essa seleção.

## Interface

Pendentes envia `status=pendente`, Em andamento envia `status=em_andamento`
e Críticas envia `critica=true`. Ao trocar segmento, voltar à página 1 e
cancelar/ignorar a resposta anterior. Responsável null aparece como “Não atribuída”.
Cartões exibem criticidade em texto, sem depender apenas da cor.
Demandas atrasadas também recebem indicação textual. No perfil de gestor, os
filtros de responsável, período e atraso combinam com o segmento ativo e toda
alteração retorna à primeira página.
Gestores e inspetores podem pesquisar pelo número SEI dentro do próprio escopo.
O formulário do gestor consulta possíveis correspondências ao sair do campo e
mantém o salvamento disponível após o aviso.

## Entrada assistida do SEI

Nesta etapa, somente gestores vinculados a uma equipe podem preparar e confirmar
uma importação. A prévia também pertence ao usuário que a criou; outro gestor da
mesma equipe não pode consultá-la.

`POST /api/importacoes/sei/` recebe `texto`, com no máximo 20.000 caracteres.
O parser reconhece somente linhas `Rótulo: valor` do formato fictício atualmente
documentado. A resposta não expõe o texto bruto e contém campos interpretados,
avisos, erros, possíveis duplicidades e expiração. A prévia dura 24 horas.

`GET /api/importacoes/sei/{id}/` recupera uma prévia ativa autorizada.

`PATCH /api/importacoes/sei/{id}/` recebe correções para `sei_numero`, `assunto`,
`tipo_processo`, `unidade` e `data_autuacao`. O número é obrigatório para tornar
a prévia válida.

`POST /api/importacoes/sei/{id}/confirmar/` recebe os dados operacionais da
demanda. Título e prazo são obrigatórios. A confirmação usa o número revisado da
prévia, cria a demanda em transação, relaciona os registros e apaga o texto
bruto. Uma prévia confirmada não pode ser reutilizada.

`DELETE /api/importacoes/sei/{id}/` descarta a prévia e apaga o texto bruto. Uma
prévia expirada também é encerrada e exige uma nova colagem.

O parser atual não comprova compatibilidade com a instalação da VISAT. Ele existe
para validar o fluxo do produto com dados fictícios e deve receber um adaptador
específico somente após amostras anonimizadas serem aprovadas.
