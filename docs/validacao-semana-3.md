# Validação técnica — detalhe e histórico de demandas

Data: 06/09/2026. Ambiente local Windows 64 bits, Python 3.12.14,
Node.js 24.19.0, Django 5.2.17, PostgreSQL 17.11 e Microsoft Edge.

## Resultado

- **20 testes Django aprovados:** sessão, filtros, detalhe autorizado,
  isolamento por equipe e responsável, transições, comentários e histórico.
- **18 testes Playwright aprovados:** navegação existente, lista, detalhe,
  alteração de status, atualização da lista, timeline, 404 e sessão.
- Oxlint, TypeScript e build de produção aprovados.
- Axe sem violações nas regras WCAG A/AA selecionadas na tela de detalhe móvel.
- Layout sem rolagem horizontal em 390 px; build confirmou a rota dinâmica
  `/demandas/:id`.

## Fluxo integrado

A validação foi repetida usando frontend e Django reais, cookie de sessão,
proteção CSRF e PostgreSQL local. Uma demanda atribuída ao inspetor percorreu:

1. listagem de Pendentes;
2. consulta do detalhe;
3. alteração de `pendente` para `em_andamento`;
4. criação automática do evento de status;
5. inclusão de comentário;
6. nova consulta do detalhe e da lista.

O detalhe retornou dois eventos, incluindo o comentário “Validação integrada da
timeline.”, e a contagem autorizada de pendentes passou de 67 para 66. A mudança
foi feita apenas na massa fictícia local.

## Consistência verificada

- Status e evento são gravados dentro da mesma transação.
- Transição inválida ou repetida retorna 400 sem acrescentar evento.
- Gestor recebe 403 ao tentar executar uma demanda.
- Inspetor não responsável e usuário de outra equipe recebem 404.
- Comentário recebe autor e horário do servidor; texto vazio é rejeitado.
- Histórico é ordenado do evento mais recente para o mais antigo e não oferece
  métodos de edição ou exclusão pela API.
- Ao voltar ao segmento Pendentes, uma demanda iniciada não permanece na lista.

## Limitações

- Aprovação, correção, cancelamento e reabertura ainda não fazem parte das
  transições disponíveis.
- Comentários são registros simples, sem edição, menções ou anexos.
- A validação da interface e das regras com a equipe VISAT continua pendente.
- A hospedagem estática atual não executa o Django; a integração foi validada
  no ambiente local do projeto.
