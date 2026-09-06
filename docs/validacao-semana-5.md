# Validação técnica — avisos e regressão do Status Report 1

Data: 06/09/2026. Ambiente local Windows 64 bits, Python 3.12.14,
Node.js 24.19.0, Django 5.2.17, PostgreSQL 17.11 e Microsoft Edge.

## Resultado

- **36 testes Django aprovados:** autenticação, demandas, histórico, agenda,
  avisos, isolamento por equipe e regressões de modelo/API.
- **24 testes Playwright aprovados:** navegação, sessão, demandas, agenda,
  avisos, responsividade e acessibilidade.
- Oxlint, TypeScript e build de produção aprovados.
- Axe sem violações WCAG A/AA selecionadas no feed e no detalhe móvel.
- Feed e detalhe sem rolagem horizontal em 390 px.

## Fluxo integrado real

A migração foi aplicada e `seed_avisos` criou oito registros idempotentes no
PostgreSQL. Pelo proxy React `/api`, uma sessão real de gestor recebeu quatro
avisos da equipe. O primeiro foi “Plantão extraordinário”, marcado como
“urgente”; seu detalhe retornou o conteúdo completo esperado.

## Comportamentos verificados

- Urgentes aparecem antes de informativos e os mais recentes primeiro.
- Feed omite o conteúdo completo e retorna somente registros da equipe.
- Gestor e inspetor podem consultar feed e detalhe da própria equipe.
- Aviso de outra equipe retorna `404`; ausência de sessão retorna `401`.
- Feed e detalhe usam uma consulta SQL cada, sem N+1 para autor.
- Datas são serializadas em `America/Fortaleza`.
- Loader, vazio, erro com nova tentativa, item ausente e sessão expirada são
  tratados pela interface.
- A URL `/avisos/{id}` suporta atualização, voltar ao feed e histórico do
  navegador.

## Limitações

- Avisos são somente leitura neste MVP.
- A revisão visual, o ensaio e a aprovação do congelamento dependem da equipe.
- A demonstração hospedada estática não executa Django; a integração foi
  validada localmente.
