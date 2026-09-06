# Checklist de demonstração — Status Report 1

Apresentação: **03/10/2026**. Versão candidata identificada pela tag local
`status-report-1-candidato`. A equipe deve aprovar essa referência antes da
apresentação; qualquer correção posterior exige novo smoke e build.

## Preparação do ambiente

```powershell
cd backend
uv sync
uv run python manage.py migrate
$env:CENTRALIZA_DEMO_PASSWORD = "defina-uma-senha-local-segura"
uv run python manage.py seed_demo --total 30
uv run python manage.py seed_agenda
uv run python manage.py seed_avisos
uv run python manage.py runserver
```

Em outro terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Confirmar antes de apresentar:

- [ ] PostgreSQL disponível e migrações aplicadas.
- [ ] Gestor e inspetor de demonstração conseguem entrar.
- [ ] Browser em 1366 px e zoom de 100%.
- [ ] Demandas, Agenda e Avisos possuem dados fictícios.
- [ ] Nenhum dado real ou credencial aparece na tela.
- [ ] Capturas ou gravação curta estão disponíveis como contingência.

## Roteiro de até 8 minutos

| Tempo | Demonstração | Mensagem principal |
| --- | --- | --- |
| 0:00–0:50 | Problema e proposta | Centralizar demandas, planejamento e comunicação da VISAT |
| 0:50–1:30 | Login e perfis | Sessão protegida e visibilidade conforme responsabilidade |
| 1:30–3:40 | Demandas | Filtros, detalhe, alteração de status e histórico rastreável |
| 3:40–5:10 | Agenda | Dia, semana, mês, navegação e horário de Fortaleza |
| 5:10–6:20 | Avisos | Urgência explícita, feed da equipe e conteúdo completo |
| 6:20–7:15 | Qualidade e arquitetura | React, Django, PostgreSQL, testes e controle de acesso |
| 7:15–8:00 | Limitações e próximos passos | Escrita, anexos, revisão do gestor e chat permanecem no backlog |

## Smoke imediatamente antes da apresentação

1. Entrar como gestor, abrir os cinco módulos e sair.
2. Entrar como inspetor, filtrar demandas, abrir uma demanda e avançar seu
   status permitido; confirmar o evento na timeline e o reflexo na lista.
3. Abrir Agenda, alternar Dia/Semana/Mês, navegar e usar Hoje.
4. Abrir Avisos, conferir as duas tags e acessar o primeiro urgente.
5. Atualizar a página de detalhe e usar Voltar aos avisos.
6. Confirmar menu, foco visível e ausência de rolagem horizontal em celular.

## Perguntas esperadas

- **Como os dados são protegidos?** Django exige sessão e filtra todas as
  consultas pela equipe e pelo perfil autenticado.
- **Como o histórico mantém rastreabilidade?** Cada mudança de status e
  comentário gera um evento separado com autor e horário.
- **Como o fuso é tratado?** O banco guarda instantes conscientes e a API da
  Agenda responde explicitamente em `America/Fortaleza`.
- **O que ainda não está pronto?** Criação e gestão completa das demandas,
  agenda e avisos, anexos, aprovação gerencial, notificações e chat real.
- **Os dados da demonstração são reais?** Não. As cargas são fictícias,
  reproduzíveis e bloqueadas fora do modo de desenvolvimento.

## Regra de congelamento

Após aprovação da equipe, não adicionar funcionalidades à versão candidata.
Aceitar somente correções que bloqueiem a apresentação, segurança, integridade
dos dados ou acessibilidade. Registrar cada correção em commit próprio e repetir
suíte Django, Playwright, lint, tipos e build.
