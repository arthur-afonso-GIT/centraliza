# Contrato de listagem de demandas

Decisão iniciada em S2-01 e ampliada pelo MVP operacional. Cadastro e edição
são exclusivos da gestão; as transições usam um endpoint específico e transacional.

## Acesso e filtros

`GET /api/demandas/` exige sessão autenticada no Django. Gestor acessa demandas
da própria equipe; inspetor acessa as atribuídas a ele nessa equipe. Nunca
usar perfil ou ID enviados pelo cliente como autorização. Sem equipe, negar
acesso. O filtro de acesso também limita o total informado na paginação.

São ativos `pendente`, `aceita`, `em_andamento`, `aguardando_avaliacao` e `em_correcao`.
`concluida` e `cancelada` distinguem registros encerrados. A listagem padrão
retorna apenas ativos; filtros explícitos por esses dois estados permitem
consultar demandas encerradas dentro do mesmo escopo de autorização.
Crítica é uma flag independente. Status e criticidade combinados usam AND.

| Parâmetro | Validação |
| --- | --- |
| status | Opcional: pendente, aceita, em_andamento, aguardando_avaliacao, em_correcao, concluida ou cancelada |
| critica | Opcional: true ou false |
| responsavel | ID inteiro positivo; disponível ao gestor |
| prazo_de | Data inicial inclusiva em AAAA-MM-DD |
| prazo_ate | Data final inclusiva em AAAA-MM-DD |
| atrasada | true ou false; compara o prazo com o instante atual; demandas concluídas e canceladas não ficam atrasadas |
| sei_numero | Até 80 caracteres; busca parcial após normalização tolerante |
| page | Inteiro positivo, padrão 1 |
| page_size | Inteiro de 1 a 50, padrão 20 |

Ordenar por prazo crescente e ID crescente. Retornar `count`, `next`,
`previous` e `results`; cada resultado contém ID, título, status, prioridade,
prazo ISO, número SEI, flag crítica e responsável `{id, nome}` ou null.

Resposta vazia: 200 com lista vazia; parâmetro inválido: 400; sessão ausente:
401; usuário sem equipe: 403; página fora do intervalo: 404. Página 1 de
uma lista vazia é válida. Escrita segue as permissões de gerenciamento abaixo.

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

Pendentes envia `status=pendente`, Aceitas envia `status=aceita`, Em andamento envia `status=em_andamento`
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


## HU3 — Prazo com data e horário

`prazo` é retornado como datetime ISO 8601 com fuso. Os formulários usam
America/Fortaleza (UTC−3), independentemente do fuso do navegador. Filtros
`prazo_de` e `prazo_ate` continuam aceitando datas e incluem o dia inteiro no
fuso institucional. A listagem e o painel consideram o horário no atraso.

`PATCH /api/demandas/{id}/prazo/` recebe o prazo
`{"prazo":"2026-10-30T17:00:00-03:00"}` e retorna os detalhes atualizados.
O frontend também envia `atualizada_em`, copiado da última leitura. Se a versão
não corresponder à demanda bloqueada na transação, a API retorna 409 sem gravar
prazo ou histórico. O formulário oferece recarregar os dados antes de tentar
novamente. Clientes antigos sem esse campo continuam aceitos e usam a última
gravação; a proteção contra sobrescrita depende do envio da versão.
A edição geral do Gestor aceita a mesma versão e não reenvia o prazo quando
somente outros campos foram alterados. Salvar sem mudar o prazo preserva
segundos e frações recebidos da API.
Permite gestor da equipe participante e inspetor responsável com acesso à
mesma demanda. Demandas concluídas ou canceladas retornam 400; usuários sem
acesso recebem 404; sessão ausente recebe 401. Outros campos são rejeitados.
Alterações efetivas registram autor, horário e os prazos anterior e novo no
histórico. Reenviar o mesmo prazo não duplica o evento.

A migração 0013 preserva os vencimentos antigos às 23:59 da mesma data em
America/Fortaleza. Por compatibilidade, criação/edição geral ainda aceitam
clientes antigos com data apenas, interpretada como 23:59. A nova operação
específica exige data e horário. O MVP permite datas passadas; o vencimento é
exibido como atrasado, sem impor uma restrição ausente na HU3.

Validação: testes de API em `demandas.test_prazos` e testes de interface em
`frontend/tests/prazo-demanda.spec.ts`. Após atualizar o projeto, execute
`uv run python manage.py migrate` antes de iniciar a API.


### Regressões da HU3

A suíte inclui entradas JSON malformadas, datas impossíveis e extremas,
autenticação, CSRF, usuário desativado, retirada de acesso, troca de responsável,
perfis de equipes participantes, atomicidade entre prazo e histórico,
concorrência com duas conexões PostgreSQL, conflitos de versão e migração com
registros antigos (incluindo data bissexta), com ida e reversão.
Os filtros usam intervalos de timestamps calculados em Python, com início
inclusivo e fim exclusivo no dia seguinte; não fazem conversão de fuso no banco.
A migração valida as referências pendentes antes de alterar a tabela no
PostgreSQL, mantendo todas as operações na mesma transação.

A versão avança mesmo em gravações muito rápidas ou com relógio de baixa
resolução. A ação específica de prazo altera somente o vencimento e a versão,
sem revalidar a equipe principal atual do criador histórico ou do responsável;
a permissão é conferida com a equipe ativa e o responsável da demanda.

Evidências e comandos reproduzíveis: [validação da HU3](validacao-hu3.md).
