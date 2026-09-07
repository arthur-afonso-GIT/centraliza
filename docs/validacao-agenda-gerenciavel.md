# Validação da Agenda gerenciável

## Escopo entregue

O gestor pode criar e editar reuniões ou atividades, escolher inspetores ativos
da equipe, associar uma demanda e cancelar o compromisso. O cancelamento é
lógico e preserva autor e data. O calendário atualiza o intervalo visível depois
de cada operação, mantendo as visões de dia, semana e mês.

Antes de salvar, o backend procura compromissos ativos sobrepostos para cada
participante. Intervalos contíguos são permitidos e conflitos retornam HTTP 409
com os compromissos envolvidos. Entradas e respostas usam explicitamente o fuso
`America/Fortaleza`.

## Verificações executadas

- 56 testes Django aprovados; cinco cobrem o gerenciamento, autorização,
  validações, conflito, vínculo com demanda e cancelamento lógico.
- Dois novos cenários Playwright aprovados para o fluxo gerencial e a consulta
  do inspetor.
- Três cenários anteriores da Agenda aprovados para navegação, responsividade,
  acessibilidade e recuperação de erro.
- Oxlint e build de produção aprovados.

A migração foi aplicada no PostgreSQL local e a suíte completa de 60 testes
Django passou nesse banco em 7 de setembro de 2026.

## Limites atuais

O MVP não oferece recorrência, lembretes, edição por arrastar ou resolução
automática de conflitos. A detecção ocorre na transação da aplicação; uma futura
implantação com alta concorrência deverá acrescentar uma estratégia de bloqueio
ou restrição específica no PostgreSQL.
