# HU 4 — Atribuir prioridade a uma demanda

O inspetor responsável pode escolher prioridade baixa, média ou alta no detalhe
de uma demanda ativa. Demandas concluídas e canceladas não permitem a ação.
A edição geral do gestor permanece disponível conforme suas permissões atuais.

`PATCH /api/demandas/{id}/prioridade/` recebe somente `prioridade` e exige sessão
e CSRF. Outro responsável ou equipe sem acesso recebe 404. Gestores usam a edição
geral, e recebem 403 nesta ação específica do inspetor. Valores inválidos,
campos extras e demandas encerradas retornam 400.

A operação bloqueia a demanda e registra alteração e histórico na mesma transação.
O evento informa autor, horário e prioridades anterior e nova. Repetir a prioridade
atual não cria outro evento. A resposta atualiza as informações e a timeline na tela.

Testes: `python manage.py test demandas.test_prioridade` e
`npx playwright test tests/prioridade-demanda.spec.ts`.

## Validação desta implementação

- 57 testes Django aprovados: HU 4 e regressão de demandas, em SQLite temporário.
- 8 cenários Playwright aprovados no Edge: prioridade e detalhe, incluindo
  erro/repetição, recarga, restrição por perfil/estado e acessibilidade móvel.
- TypeScript, Oxlint e build de produção aprovados.
- PostgreSQL e concorrência entre conexões não foram validados nesta execução.
- Nenhuma migração nova é necessária.
