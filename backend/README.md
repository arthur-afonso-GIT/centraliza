# API Centraliza

Base Django e PostgreSQL para as regras e os dados do Centraliza. Nesta etapa,
contém os modelos, uma carga fictícia, sessão protegida por CSRF e a listagem
paginada de demandas com acesso por equipe e perfil.

## Endpoints disponíveis

- `GET /api/auth/csrf/`, `POST /api/auth/login/`, `GET /api/auth/me/` e
  `POST /api/auth/logout/` para a sessão.
- `GET /api/demandas/` para filtros por `status`, `critica`, `page` e `page_size`.
- `GET /api/demandas/{id}/` para dados completos e histórico autorizado.
- `PATCH /api/demandas/{id}/status/` para o inspetor responsável executar a
  próxima transição permitida.
- `POST /api/demandas/{id}/historico/` para adicionar um comentário simples.
- `GET /api/compromissos/?inicio={ISO}&fim={ISO}` para listar compromissos
  sobrepostos ao intervalo autorizado, com horários em `America/Fortaleza`.

Alterações de status geram um evento na mesma transação. O histórico exposto
pela API não oferece edição ou exclusão.

## Preparação local

Requisitos: `uv` e PostgreSQL 16 ou superior em execução. Copie `.env.example`
para `.env`, escolha uma senha local e crie o banco e usuário correspondentes.
O arquivo `.env` e os dados locais são ignorados pelo Git.

```powershell
uv sync
uv run python manage.py migrate
$env:CENTRALIZA_DEMO_PASSWORD = "Centraliza@2026"
uv run python manage.py seed_demo --total 30
uv run python manage.py seed_agenda
uv run python manage.py test
uv run python manage.py benchmark_demandas --requests 30 --warmup 5
uv run python manage.py runserver
```

Use `--total 1000` para a massa de desempenho. O comando é idempotente por
referência: não apaga dados e não duplica sua própria massa. Só funciona com
`DJANGO_DEBUG=1` e exige a senha pelo ambiente. A senha é aplicada na criação;
contas existentes preservam a senha anterior.
O benchmark também só funciona em desenvolvimento, usa a conta
`demo.gestor.1` por padrão e informa média, p95, máximo e consultas por chamada.
A carga da agenda cria 12 compromissos e exige que `seed_demo` tenha sido
executado antes; ela também pode ser repetida sem duplicar registros.

As contas locais preparadas atualmente usam a senha `Centraliza@2026`:

- gestores: `demo.gestor.1` e `demo.gestor.2`;
- inspetores: `demo.inspetor.1`, `demo.inspetor.2`, `demo.inspetor2.1` e
  `demo.inspetor2.2`.

O banco isolado usado no desenvolvimento deste repositório escuta somente em
`127.0.0.1:55432` e fica em `.local`, fora do controle de versão. Outra pessoa
pode usar sua instalação normal do PostgreSQL ajustando as variáveis do `.env`.

Se essa instância local já tiver sido preparada e `migrate` retornar
`connection timeout expired`, inicie-a na raiz do repositório antes de subir a
API:

```powershell
& '.\.local\postgresql\pgsql\bin\pg_ctl.exe' start `
  -D '.\.local\pgdata' `
  -l '.\.local\postgresql.log' `
  -o '-p 55432 -h 127.0.0.1' `
  -w
```

Confirme com `.\.local\postgresql\pgsql\bin\pg_isready.exe -h 127.0.0.1 -p
55432 -d centraliza`. A resposta esperada é `accepting connections`.
