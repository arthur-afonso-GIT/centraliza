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

## Checklist técnico verificado

- [x] Entrar como Gestor e como Inspetor.
- [x] Conferir a identificação do perfil de demonstração.
- [x] Navegar pelas cinco páginas e conferir o item selecionado.
- [x] Atualizar uma rota interna e usar voltar/avançar do navegador.
- [x] Sair e tentar acessar uma página protegida.
- [x] Abrir uma URL inexistente e retornar à Home.
- [x] Navegar por teclado com foco visível.
- [x] Abrir o menu móvel, selecionar uma página e conferir seu fechamento.
- [x] Fechar o menu móvel com Escape.
- [x] Conferir carregamento e recuperação de erro da sessão.
- [x] Conferir a interface em largura de celular e computador.

Esses itens registram verificação técnica. A revisão e aceitação pela equipe
VISAT ainda não foram realizadas; usar o mesmo roteiro na apresentação.

## Fora do escopo

CRUD de demandas, calendário funcional, mensagens reais, anexos, avisos
publicáveis, indicadores de desempenho e implantação de banco de dados.

## Validação automatizada realizada

A suíte contém 12 testes de navegador, todos aprovados em Microsoft Edge.
Além dos fluxos iniciais, cobre acesso direto às rotas, perfil inválido,
falhas de leitura/escrita/remoção da sessão, carregamento, atalho de conteúdo,
foco após navegação e análise de acessibilidade em celular e desktop.

Veja o [relatório e as evidências](validacao-semana-1.md) para escopo e limites.
