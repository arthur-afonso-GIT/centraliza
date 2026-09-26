# Avisos e confirmação de leitura — história 30

Referência: [Histórias do usuário no Notion](https://www.notion.so/3c73d03a0b9e8040afc1dff24a3e2bc8).

## Comportamento

Ao exibir o conteúdo completo de um aviso publicado, o frontend solicita o
registro de leitura. Cada usuário tem seu próprio estado, persistido no banco.
Reabrir o aviso não duplica a confirmação nem muda o horário da mesma leitura.
Consultar o feed ou fazer GET do detalhe não altera dados.

Editar o aviso faz com que a nova versão apareça como não lida. A confirmação
inclui a versão visualizada, evitando marcar como lido um texto alterado durante
a consulta. As confirmações existentes não são apagadas: a data de leitura é
comparada à atualização do aviso.

## API

Feed, detalhe e resumo da Home incluem `lido`, `lido_em`, `atualizado_em` e
`situacao` (`ativo`, `agendado` ou `expirado`).

`POST /api/avisos/{id}/leitura/` recebe `{"atualizado_em": "<data ISO da versão>"}`
e devolve `lido` e `lido_em`. Exige sessão e CSRF. Retorna 400 para versão
inválida, 409 para versão desatualizada e 404 para aviso inacessível, cancelado,
agendado ou expirado. Inspetores só confirmam avisos gerais ou destinados a eles
na equipe ativa. Uma restrição única por aviso e usuário impede duplicidades;
a confirmação e a edição bloqueiam a linha do aviso dentro de uma transação.

## Interface

- Contador de avisos publicados ainda não lidos.
- Busca por título, resumo ou autor; filtros por leitura e categoria.
- Gestor pode filtrar publicados, agendados e expirados.
- Identificação textual de leitura, prioridade, público e vigência.
- Falhas na confirmação preservam o conteúdo e oferecem nova tentativa.
- Formulário inicia com o horário de Fortaleza e informa público e agendamento.
- Alterações avisam que a equipe precisará ler a nova versão.
- Cancelamento mostra carregamento e erro sem fechar o diálogo prematuramente.

## Instalação

Executar `uv run python manage.py migrate` no backend para criar a tabela de
leituras. Não é necessário recriar avisos nem executar a carga de demonstração.
