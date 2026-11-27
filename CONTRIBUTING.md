# Como contribuir com o Centraliza VISAT

Este guia orienta integrantes da equipe e novos colaboradores a preparar o
ambiente, desenvolver uma tarefa, validar o resultado e enviar alterações para revisão.
Conheça primeiro a visão geral no [README](README.md).

## 1. Escolha e alinhe a tarefa

Consulte o [quadro do Trello](https://trello.com/b/0qDLqz1F/centraliza) e os
[registros das sprints](docs/sprint-05.md). Identifique a história de usuário,
o responsável e os critérios de aceite antes de começar, evitando trabalho duplicado.

Para sugerir uma melhoria ou relatar um problema, use uma issue no GitHub ou um
card do projeto. Informe o objetivo, passos para reproduzir, comportamento esperado
e observado, ambiente e evidências sem dados pessoais. Mudanças de escopo ou de
contrato devem ser combinadas com os responsáveis pelos módulos afetados.

## 2. Prepare o ambiente

Requisitos conforme os arquivos de configuração do projeto:

- Git.
- Node.js 24.x e npm, conforme `frontend/package.json`.
- Python 3.13, indicado em `backend/.python-version`, e uv. O backend aceita
  Python >=3.12 e <3.14, conforme `backend/pyproject.toml`.
- PostgreSQL 16 ou superior em execução.
- Microsoft Edge instalado para a configuração atual dos testes Playwright.

Os comandos abaixo usam PowerShell, inclusive no terminal do VS Code.

```powershell
git clone https://github.com/arthur-afonso-GIT/centraliza.git
cd centraliza
```

### Backend: Django e PostgreSQL

Crie um usuário e um banco PostgreSQL locais. Ajuste nome, usuário, senha, host e
porta no arquivo de ambiente; o exemplo usa a porta 55432, mas sua instalação
pode usar 5432. O usuário dos testes Django precisa poder criar o banco de teste.
Não use o banco de produção para desenvolvimento ou testes.

```powershell
cd backend
Copy-Item .env.example .env
```

Edite `.env` antes de continuar, definindo os dados do PostgreSQL e uma
`DJANGO_SECRET_KEY` de desenvolvimento. Preserve `DJANGO_DEBUG=1` no ambiente local.
Não sobrescreva um `.env` existente com valores que ainda não conferiu.

```powershell
uv sync --locked
uv run python manage.py migrate
$env:CENTRALIZA_DEMO_PASSWORD = "escolha-uma-senha-local"
uv run python manage.py seed_demo --total 30
uv run python manage.py seed_agenda
uv run python manage.py seed_avisos
uv run python manage.py runserver
```

A API local atende normalmente em `http://127.0.0.1:8000`.
As cargas usam dados fictícios. `seed_demo` define a senha na criação das contas;
reexecutá-lo não troca a senha de contas existentes. Consulte os usuários de
exemplo e detalhes do banco no [guia do backend](backend/README.md).

### Frontend: React e TypeScript com vinext

Em outro terminal, partindo da raiz do clone:

```powershell
cd frontend
npm ci
npm run dev
```

Abra o endereço exibido, normalmente `http://localhost:3000`. O frontend encaminha
`/api` ao backend em `http://127.0.0.1:8000`. Para outra API local, defina
`$env:CENTRALIZA_API_URL` antes de executar `npm run dev`.

Use os arquivos de lock existentes. Atualizações de dependências devem ser
intencionais e incluir os respectivos arquivos de lock na revisão.

## 3. Organize sua alteração

Para novas contribuições, o fluxo recomendado é trabalhar em uma branch e abrir
um pull request. Na raiz do clone, com o trabalho anterior salvo:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/hu-numero-descricao-curta
```

Sugestões de nomes: `feature/hu-26-criar-reuniao`, `fix/filtro-conversas` e
`docs/guia-contribuicao`. São convenções recomendadas, não regras automáticas
configuradas no GitHub. Se não tiver permissão de escrita, use um fork e abra o
pull request a partir dele.

- Mantenha cada alteração focada em uma tarefa.
- Siga a organização e o estilo dos arquivos próximos ao código alterado.
- Preserve contratos de API e atualize documentação e consumidores quando necessário.
- No backend, aplique permissões por perfil e equipe; ocultar um botão não protege a API.
- Ao alterar modelos Django, inclua a migração correspondente e avalie o impacto nos dados.
- No frontend, preserve acessibilidade, navegação por teclado e estados de carregamento,
  vazio, erro e recuperação. A interface utiliza português brasileiro.
- Não reformate arquivos sem relação com a tarefa nem descarte alterações de colegas.

As responsabilidades e decisões existentes estão no
[plano de desenvolvimento](docs/plano-desenvolvimento.md), nos documentos de
[contrato de demandas](docs/contrato-demandas.md) e de
[contrato de equipes](docs/contrato-equipes.md).

## 4. Valide o resultado

Execute verificações proporcionais ao que mudou e registre os comandos e resultados.
Para alterações funcionais que afetam os dois lados, a sequência de referência é:

```powershell
# Partindo da raiz do clone
cd backend
uv run python manage.py check
uv run python manage.py makemigrations --check --dry-run
uv run python manage.py test

cd ../frontend
npm run lint
npm run typecheck
npm run build
npm test
```

Os testes Django usam PostgreSQL. A suíte Playwright comum inicia o frontend e
simula a API no navegador; ela não comprova a integração com o backend real.
A configuração atual usa o canal `msedge`. Se for necessário outro navegador,
alinhe a mudança de configuração com a equipe.

### Validação integrada

Para validar frontend, API e banco reais, existe um roteiro separado. Na raiz,
com dependências instaladas, PostgreSQL acessível e portas 3000 e 8000 livres:

```powershell
.\scripts\smoke-integrado.ps1
```

O script **recria o banco descartável `centraliza_smoke`**, prepara dados fictícios,
inicia os serviços e executa o fluxo de navegador. Leia o script e confira suas
credenciais locais antes de executá-lo. Os parâmetros `DatabaseUser`,
`DatabasePassword` e `DemoPassword` permitem adaptar o ambiente.
Evidências de falha ficam em `frontend/test-results-smoke`.

Para documentação, confira os caminhos dos links, imagens e a prévia Markdown;
não é necessário executar a aplicação apenas por uma alteração de texto.
Não declare um teste aprovado sem executá-lo: registre bloqueios e limitações.

Quando houver alterações de código, siga também a orientação do README para
atualizar o Graphify, se disponível no ambiente. Ele é instalado separadamente:

```powershell
graphify update . --no-cluster
```

## 5. Commits e pull requests

Antes de registrar a alteração, confira o diff e selecione apenas os arquivos da tarefa:

```powershell
git status --short
git diff
git diff --check
git add caminho/do/arquivo
git commit -m "docs: descreve a alteracao realizada"
git push -u origin HEAD
```

Substitua o caminho e a mensagem pelos dados da sua tarefa. Prefira títulos curtos
em português; prefixos como `feat:`, `fix:`, `docs:` e `test:` ajudam a identificar
o objetivo. O corpo do commit pode explicar motivo, alterações e validação.

Abra um pull request para a branch acordada pela equipe, normalmente `main`, com:

- Problema resolvido e vínculo com a HU, issue ou card do Trello.
- Resumo das alterações e efeitos no comportamento do sistema.
- Comandos de validação e resultados reais.
- Capturas de tela quando houver mudança visual.
- Migrações, configurações necessárias, limitações ou pendências.

Solicite revisão de outro integrante. Resolva os comentários antes de integrar.
Não use force-push em branches compartilhadas nem publique mudanças em produção
sem alinhar com a equipe.

## 6. Pair programming e documentação das sprints

Registre participantes, histórias trabalhadas, divisão das atividades, decisões,
validações e aprendizados. Preserve a autoria de cada integrante.

Mantenha os relatórios em `docs/` e os links na sprint correspondente do README.
Para relatórios PNG, siga o padrão existente: link para o arquivo e prévia em
`<details>` com `<summary>`. Não altere evidências originais sem necessidade.
Atualize o registro da sprint com o que foi entregue e o que ainda está pendente.

## 7. Dados e colaboração responsável

Use apenas dados fictícios ou devidamente anonimizados em testes, imagens e relatos.
Não envie `.env`, senhas, tokens, cookies, bancos locais ou documentos reais da VISAT
para o Git. A demonstração do SEI não autoriza acesso a sistemas institucionais.

Se encontrar uma vulnerabilidade ou segredo exposto, avise os responsáveis em
canal privado, sem publicar credenciais ou dados sensíveis em uma issue aberta.
Mantenha uma comunicação respeitosa e explique as decisões para facilitar a revisão
e a continuidade do trabalho por outras pessoas.
