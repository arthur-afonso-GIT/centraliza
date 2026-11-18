# Filtros de conversas (S5, Could)

Implementação preparada sobre a versão consultada da `main` em 18/11/2026.

## Critérios
- Palavra-chave: título, nomes dos participantes e mensagens, sem diferenciar maiúsculas ou acentos.
- Data inicial e final inclusivas; uma conversa corresponde se sua criação ou pelo menos uma mensagem ocorreu no período.
- Participante: identificação numérica, não comparação por nome.
- Filtros combinados: todas as condições devem ser satisfeitas (AND).
- Limpar filtros; mensagem para lista vazia; validação de intervalo de datas.

## Integração
O módulo `chats` do repositório original ainda é apenas uma tela de 'Em desenvolvimento'.
Não há API/modelo de conversa no backend consultado. O componente reutilizável
`frontend/components/conversas-filtros.tsx` recebe `conversas` já autorizadas pela API;
**não** gera dados fictícios e não deve ser apresentado como chat operacional.

Quando a funcionalidade de conversas for implementada, renderize
`<ConversasFiltros conversas={conversasAutorizadas} onSelecionar={abrirConversa} />`
na página de Chats e adapte o tipo `ConversaFiltravel` à resposta do backend.
É obrigatório restringir permissões no backend antes de fornecer os dados ao filtro
local; filtragem no cliente não substitui autorização. Para grandes volumes,
migrar o filtro para consulta paginada no servidor.

## Verificações
Executar `node --experimental-strip-types --test frontend/tests/conversas-filtros.test.ts`
na raiz do repositório (Node 22+ com suporte ao strip types).
Não foi realizado merge na main.
