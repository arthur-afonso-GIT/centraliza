# Validação de anexos de demandas

## Escopo entregue

O detalhe da demanda permite que o gestor ou o inspetor responsável envie PDF,
JPEG e PNG de até 10 MB. O banco armazena metadados e o arquivo recebe um nome
interno aleatório em uma pasta sem rota pública. Listagem e download passam pela
mesma autorização de equipe e responsável usada no detalhe da demanda.

A remoção é lógica: o arquivo deixa de aparecer e de ser baixado, enquanto o
registro e o evento de histórico permanecem disponíveis para auditoria.

## Verificações executadas

- 51 testes Django aprovados, incluindo formato, assinatura, tamanho, acesso de
  outra equipe, download protegido e remoção lógica.
- Dois novos cenários Playwright aprovados para envio, download, remoção,
  validação no navegador e acessibilidade.
- Quatro cenários de regressão do detalhe verificados; uma colisão temporária de
  artefatos entre processos Playwright foi isolada e o cenário afetado passou em
  execução exclusiva.
- Oxlint e build de produção aprovados.

A migração foi aplicada no PostgreSQL local e a suíte completa de 60 testes
Django, incluindo os anexos, passou nesse banco em 7 de setembro de 2026.

## Limites antes de produção

O MVP valida extensão, MIME e assinatura inicial, mas ainda precisa de varredura
antivírus, política de retenção, cotas por demanda, backup do armazenamento e
teste de restauração. O diretório local padrão é adequado ao desenvolvimento;
uma implantação com múltiplas instâncias deverá usar armazenamento persistente
compartilhado.
