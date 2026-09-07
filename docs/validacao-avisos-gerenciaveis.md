# Validação dos avisos gerenciáveis

## Escopo entregue

O gestor pode publicar e editar avisos urgentes ou informativos, determinar o
início e o fim da vigência e escolher inspetores específicos. Uma seleção vazia
representa toda a equipe. O cancelamento é lógico e preserva autor e data.

O feed do inspetor considera equipe, destinatário, início, expiração e
cancelamento. O gestor visualiza os avisos não cancelados da equipe para poder
administrar publicações atuais, futuras e expiradas.

## Verificações executadas

- 60 testes Django aprovados; quatro novos testes cobrem publicação, edição,
  cancelamento, vigência, destinatários e isolamento entre equipes.
- Dois novos cenários Playwright aprovados para gestão e restrição do inspetor.
- Três cenários anteriores dos avisos aprovados para feed, detalhe,
  acessibilidade móvel e indisponibilidade entre equipes.
- Oxlint e build de produção aprovados.

A migração foi aplicada no PostgreSQL local e a suíte completa de 60 testes
Django, incluindo os avisos, passou nesse banco em 7 de setembro de 2026.

## Limites atuais

O MVP ainda não registra confirmação de leitura, não envia notificações e não
anexa documentos específicos ao comunicado. Essas funções permanecem fora do
núcleo operacional aprovado.
