# Semana 1 — navegação

## Objetivo

Permitir entrar em uma demonstração como Gestor ou Inspetor, navegar entre Home,
Agenda, Avisos, Demandas e Chats, e sair. As páginas dos módulos são estruturas
iniciais; não representam funcionalidades concluídas.

## Arquitetura desta entrega

O front-end React apresenta o layout compartilhado e as páginas. A sessão de
demonstração fica isolada da interface para ser substituída pela API Python.
PostgreSQL e autenticação real pertencem à próxima integração.

Não use dados pessoais ou credenciais reais nesta demonstração.

## Contrato proposto para a API futura

| Operação | Endpoint | Resposta esperada |
| --- | --- | --- |
| Entrar | POST /api/auth/login | Usuário e sessão por cookie HttpOnly |
| Consultar sessão | GET /api/auth/me | Usuário autenticado ou 401 |
| Sair | POST /api/auth/logout | 204, invalidando a sessão |

Formato do usuário: `{ "id": "...", "nome": "...", "perfil": "gestor" }`.
Perfis permitidos: `gestor` e `inspetor`. O backend deverá validar permissões
em todas as operações, independentemente da navegação do cliente. Autenticação
por cookie também exige proteção CSRF nas operações de escrita.

## Acesso inicial

Os dois perfis acessam os cinco módulos. As diferenças de ações serão
implementadas nas próximas entregas. Sem sessão, as páginas levam à entrada.
Rotas desconhecidas mostram uma página de erro com caminho de retorno.

## Roteiro de aceitação

- [ ] Entrar como Gestor e como Inspetor.
- [ ] Conferir o nome e o perfil exibidos.
- [ ] Navegar pelas cinco páginas e conferir o item selecionado.
- [ ] Atualizar uma rota interna e usar voltar/avançar do navegador.
- [ ] Sair e tentar acessar uma página protegida.
- [ ] Abrir uma URL inexistente e retornar à Home.
- [ ] Navegar por teclado com foco visível.
- [ ] Abrir o menu móvel, selecionar uma página e conferir seu fechamento.
- [ ] Fechar o menu móvel com Escape.
- [ ] Conferir carregamento e recuperação de erro da sessão.
- [ ] Conferir a interface em largura de celular e computador.

## Fora do escopo

CRUD de demandas, calendário funcional, mensagens reais, anexos, avisos
publicáveis, indicadores de desempenho e implantação de banco de dados.

## Validação automatizada realizada

Quatro testes de navegador verificam: navegação do gestor e saída; menu móvel
do inspetor com Enter/Escape e ausência de overflow; página 404 com retorno;
falha de armazenamento com recuperação. Todos passaram em Microsoft Edge.
O checklist acima permanece como roteiro de revisão manual da equipe.
