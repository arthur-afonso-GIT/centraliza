# Sprint 05 — planejamento e acompanhamento do chat

Este registro reúne **seis novas histórias** do chat cadastradas na lista [Sprint 05 — Chat](https://trello.com/b/0qDLqz1F/centraliza). Diferentemente dos registros de entregas anteriores, **as histórias estão em acompanhamento**: a presença de um cartão, ou mesmo uma marcação de conclusão isolada, não comprova toda a aceitação integrada. O planejamento parte do backlog de chat de 23/11/2026, com prioridades P0 (entrega utilizável) e P1 (robustez para uso contínuo).

| História | Escopo / aceite esperado | Responsável | Prioridade | Card da Sprint 05 |
| --- | --- | --- | --- | --- |
| CHAT-01 | Demonstrar conversa entre duas contas no ambiente publicado, respostas persistidas após novo login e negação de acesso indevido | Antônio Marcos | P0 | [Conversa entre duas pessoas](https://trello.com/c/ndhP2IwW) |
| CHAT-02 | Atualizar mensagens sem recarregar, dar retorno de falha/reenvio, preservar texto e evitar duplicação | Cecília de Moraes | P0 | [Recebimento e estado claro](https://trello.com/c/xKcHYnu8) |
| CHAT-03 | Persistir último ponto de leitura, indicar mensagens não lidas e zerar contagem após leitura | Luiza Beltrão | P0 | [Mensagens não lidas](https://trello.com/c/TCOY0y1f) |
| CHAT-04 | Paginar histórico e mover filtros para a API, com ordenação estável, índices e autorização | Victor Bacelar | P1 | [Histórico e busca paginada](https://trello.com/c/V0VEYYmm) |
| CHAT-05 | Gerenciar participantes com regras de visibilidade anterior, revogação imediata e auditoria | Sílvio Lobo | P1 | [Participantes da conversa](https://trello.com/c/EAVmyBOq) |
| CHAT-06 | Notificar novas mensagens dentro do Centraliza, sem alerta para o próprio autor nem exposição indevida | Lívia Cabral | P1 | [Notificações do chat](https://trello.com/c/BERarXAO) |

## Implementação no repositório

- A base já disponível inclui conversas e mensagens persistidas, acesso restrito à equipe e aos participantes e filtros por palavra-chave, data e pessoa, documentados em [FILTRO_CONVERSAS.md](FILTRO_CONVERSAS.md).
- O backend de Chats concentra rotas e regras em `backend/chats/`, e a interface e filtros utilizam `frontend/components/` e `frontend/lib/conversas.ts`.
- A aplicação atualmente documenta atualização periódica de 15 segundos e busca local sobre mensagens autorizadas; CHAT-02 e CHAT-04 propõem melhorias sobre esses comportamentos.
- CHAT-01: diagnóstico, correção do envio no PostgreSQL, smoke com duas sessões e roteiro de aceitação em [chat-01.md](chat-01.md). A validação publicada depende do administrador do Render.
- CHAT-06: contador de não lidas no menu e aviso de nova mensagem fora da tela de Chats, sem o texto da mensagem, em [CHAT-06.md](CHAT-06.md). Depende do CHAT-03.
- CHAT-01 a CHAT-03 são o núcleo P0. CHAT-04 a CHAT-06 tratam escalabilidade, controle de participantes e notificações. O planejamento não implica que cada uma dessas melhorias já esteja no código.

## Validação restante

A definição de pronto do backlog exige que duas contas reais da mesma equipe troquem mensagens, encontrem seu histórico após recarregar e recuperem falhas sem perda de conteúdo, enquanto contas não autorizadas permaneçam bloqueadas.

- Testar autorização e persistência na API Django, interação no navegador e smoke integrado com PostgreSQL real; no CHAT-01, usar dois contextos de navegador e registrar evidências do ambiente publicado.
- Conferir os casos específicos de atualização/reenvio (CHAT-02), contagem de não lidas após novo login (CHAT-03), busca paginada com volume (CHAT-04), remoção de participantes (CHAT-05) e alertas fora da tela de Chats (CHAT-06).
- Registrar PR, revisão cruzada, testes, estados de erro, acessibilidade e screencast em cada cartão; não expor credenciais em evidências ou commits.
- Os testes existentes estão descritos em [FILTRO_CONVERSAS.md](FILTRO_CONVERSAS.md), mas **não substituem** a aceitação nova em ambiente publicado. **Nenhum novo teste foi executado para a criação desta documentação.**
