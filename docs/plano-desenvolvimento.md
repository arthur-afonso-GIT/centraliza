# Plano de desenvolvimento — Centraliza

## Entrega atual: semana 1

| Tarefa | Situação | Critério de conclusão |
| --- | --- | --- |
| S1-01 — Base de navegação | Concluída | Cinco módulos, sessão fictícia, menu responsivo e quatro testes de navegador aprovados |
| S1-02 — Organização do código | Em andamento | Separar sessão, navegação e conteúdo; preservar os fluxos existentes |
| S1-03 — Mapa e documentação | Em andamento | Atualizar Graphify, instruções de execução e histórico das tarefas |

O escopo detalhado e o roteiro de revisão estão em [semana-1.md](semana-1.md).
A demonstração usa perfis fictícios: não é a autenticação definitiva da VISAT.

## Próximas entregas propostas

Sem datas atribuídas: ajustar com a equipe após a revisão da semana 1.

1. Modelar usuários, demandas, estados e permissões com a equipe VISAT.
2. Preparar Django, PostgreSQL e autenticação real com testes de acesso.
3. Implementar criação e atribuição de demandas pelo gestor.
4. Implementar aceitação, execução e envio para avaliação pelo inspetor.
5. Implementar aprovação, correção e histórico transacional.
6. Adicionar anexos e painel; depois agenda, avisos e chat.

## Processo por tarefa

1. Consultar o grafo e os arquivos envolvidos.
2. Implementar uma mudança com escopo claro.
3. Validar tipos, lint, build e testes pertinentes.
4. Atualizar o plano e o Graphify quando o código mudar.
5. Criar commit com título em português e corpo descrevendo alterações,
   motivo e validação. Não registrar uma tarefa como concluída sem evidência.

## Graphify

O Graphify está instalado separadamente do Node. Na raiz do repositório:

```powershell
graphify extract . --code-only --no-cluster --max-workers 2
graphify explain Workspace
graphify affected Workspace
graphify update . --no-cluster
```

A primeira extração cria `graphify-out/graph.json`; as seguintes atualizam o
mapa. O arquivo `.graphifyignore` exclui dependências, saídas e componentes
gerados pelo starter. O grafo é versionado; caches e caminhos locais não são.
O modo utilizado é AST local, sem envio do código a um modelo externo.
Markdown e CSS não fazem parte dessa análise: o plano deve ser atualizado
manualmente e a interface precisa de validação própria.

## Registro

- S1-01: build, TypeScript, lint da aplicação e quatro testes no Edge aprovados.
- Graphify inicial: 238 nós e 252 relações; Workspace concentra sessão e telas.
