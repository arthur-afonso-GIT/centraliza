# Validação técnica — listagem de demandas

Data: 06/09/2026. Ambiente local Windows 64 bits, Python 3.12.14,
Node.js 24.19.0, Django 5.2.17, PostgreSQL 17.11 e Microsoft Edge.

## Resultado funcional

- 15 testes do Django aprovados, cobrindo sessão, CSRF, perfis, equipes,
  filtros, paginação, parâmetros inválidos e métodos não permitidos.
- 14 cenários Playwright aprovados para sessão, navegação, listagem,
  responsividade, teclado e acessibilidade automatizada.
- Oxlint, TypeScript e build de produção aprovados.
- Fluxo local confirmado do navegador até o PostgreSQL através do proxy `/api`:
  autenticação do gestor e retorno de quatro itens na primeira página.

Os testes do navegador interceptam a API com um contrato HTTP controlado para
serem determinísticos. A verificação ponta a ponta foi executada separadamente
com os processos reais do frontend e do Django e o banco local.

## Desempenho

O comando `python manage.py benchmark_demandas` executou 5 chamadas de
aquecimento e mediu 30 chamadas sequenciais da primeira página de demandas
pendentes, autenticado como gestor. A medição usa o cliente Django no mesmo
computador, portanto avalia aplicação e banco sem latência de rede externa.

| Massa no banco | Itens autorizados pelo filtro | Média | p95 | Máximo | Consultas por chamada |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 30 | 4 | 11,30 ms | 12,84 ms | 13,21 ms | 4 |
| 1.000 | 125 | 12,99 ms | 14,79 ms | 15,03 ms | 4 |

A meta proposta de p95 abaixo de 500 ms foi atendida nas duas massas. A
quantidade constante de consultas confirma que os responsáveis são carregados
junto com as demandas e que a página não cria uma consulta adicional por cartão.
Esses números são referência local sem concorrência; não representam capacidade
de produção, latência de internet ou comportamento sob acessos simultâneos.

## Reproduzir

Com PostgreSQL preparado e a carga de demonstração criada:

```powershell
cd backend
uv run python manage.py benchmark_demandas --requests 30 --warmup 5
```

Para comparar a massa maior, execute `seed_demo --total 1000` conforme o
[README do backend](../backend/README.md) e repita o comando. A carga é
idempotente por referência e preserva os registros existentes.

## Limitações atuais

- A hospedagem estática de demonstração não executa o servidor Django; o fluxo
  integrado desta entrega foi validado localmente.
- A análise Axe complementa, mas não substitui testes com leitores de tela e
  avaliação por pessoas usuárias.
- Criação, edição e transições de demandas continuam fora desta entrega.
- Testes de carga concorrente e configuração de produção ficam para uma etapa
  posterior, quando houver ambiente de implantação definido.
