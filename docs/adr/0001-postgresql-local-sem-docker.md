# ADR 0001 — PostgreSQL local sem Docker

- **Status:** aceito
- **Data:** 2026-11-03

## Contexto

O Centraliza usa Django, React e PostgreSQL. A equipe precisa validar o fluxo
completo no navegador usando a API e o banco reais, mas ainda não possui uma
esteira de CI nem uma necessidade operacional que justifique introduzir Docker
ou um banco remoto nesta etapa.

Os testes de interface existentes continuam úteis para validações rápidas e
isoladas, porém simulam as respostas de `/api`. Eles não comprovam que o proxy
do frontend, as migrations, as regras do Django e a persistência no PostgreSQL
funcionam em conjunto.

## Decisão

O desenvolvimento local e o smoke integrado usarão uma instalação local do
PostgreSQL. No workspace Windows preparado, ela fica em `.local/postgresql`,
escuta apenas em `127.0.0.1:55432` e permanece fora do Git.

O smoke integrado terá um banco exclusivo chamado `centraliza_smoke`. A
automação recriará esse banco, aplicará migrations, criará dados fictícios,
subirá Django e frontend e executará Playwright sem interceptar `/api`.

Docker e Supabase não fazem parte dos requisitos atuais. Supabase poderá ser
avaliado para homologação ou produção. Docker Compose poderá ser adotado quando
houver CI ou quando diferenças entre ambientes locais passarem a prejudicar a
equipe.

## Consequências

- Cada integrante precisa ter PostgreSQL 16 ou superior e configurar o acesso
  conforme `backend/.env.example`, ou usar a instalação local preparada.
- O teste integrado depende dos executáveis do PostgreSQL disponíveis em
  `.local/postgresql/pgsql/bin` ou no `PATH`.
- O banco do smoke é descartável e não deve conter dados institucionais.
- Os testes de frontend com API simulada permanecem como regressão rápida.
- O smoke integrado passa a ser a verificação de aceitação entre navegador,
  frontend, API e persistência.

## Critérios para reavaliação

Esta decisão deve ser revista antes da implantação online, ao configurar CI ou
se a preparação manual do PostgreSQL gerar falhas recorrentes na equipe.
