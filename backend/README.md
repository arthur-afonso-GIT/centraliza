# API Centraliza

Base Django e PostgreSQL para as regras e os dados do Centraliza. Nesta etapa,
contém os modelos de equipe, usuário e demanda e uma carga fictícia reproduzível.

## Preparação local

Requisitos: `uv` e PostgreSQL 16 ou superior em execução. Copie `.env.example`
para `.env`, escolha uma senha local e crie o banco e usuário correspondentes.
O arquivo `.env` e os dados locais são ignorados pelo Git.

```powershell
uv sync
uv run python manage.py migrate
$env:CENTRALIZA_DEMO_PASSWORD = "uma-senha-local-com-12-caracteres"
uv run python manage.py seed_demo --total 30
uv run python manage.py test usuarios demandas
uv run python manage.py runserver
```

Use `--total 1000` para a massa de desempenho. O comando é idempotente por
referência: não apaga dados e não duplica sua própria massa. Só funciona com
`DJANGO_DEBUG=1` e exige a senha pelo ambiente; não há senha padrão no código.

O banco isolado usado no desenvolvimento deste repositório escuta somente em
`127.0.0.1:55432` e fica em `.local`, fora do controle de versão. Outra pessoa
pode usar sua instalação normal do PostgreSQL ajustando as variáveis do `.env`.
