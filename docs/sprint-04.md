# Sprint 04 — registro de entregas e validação

A Sprint 04 reúne **seis histórias** de reuniões, avisos e conversas. A lista [Sprint 04 — Entregas](https://trello.com/b/0qDLqz1F/centraliza) contém os cartões do cronograma SR2, distribuídos segundo a [seção Sprint 04 do README](../README.md). As semanas S3, S4 e S5 escritas nos cartões representam o planejamento original do SR2 e não são equivalentes à numeração das sprints do README. O status de conclusão no Trello deve ser confrontado com os testes de aceitação e o ambiente publicado.

| História | Escopo | Responsável | Card da Sprint 04 |
| --- | --- | --- | --- |
| HU 26 | Criar reunião com título, início, fim e pauta, respeitando as regras de agendamento | Lívia Cabral | [Criar reuniões](https://trello.com/c/9omk4LXM) |
| HU 27 | Incluir participantes e refletir o compromisso na agenda, com aviso aos envolvidos | Sílvio Lobo | [Participantes da reunião](https://trello.com/c/byDHSZTy) |
| HU 28 | Criar e editar rascunhos de avisos sem publicá-los aos destinatários | Victor Bacelar | [Rascunhos de avisos](https://trello.com/c/LqxjSTP3) |
| HU 29 | Publicar avisos para destinatários selecionados, com rastreabilidade e controle de acesso | Antônio Marcos | [Publicação de avisos](https://trello.com/c/XxgRtftW) |
| HU 31 | Listar e abrir conversas autorizadas, com histórico persistido | Luiza Beltrão | [Listagem de conversas](https://trello.com/c/lGf9SdLx) |
| HU 32 | Filtrar conversas por palavra-chave, período e participante | Cecília de Moraes | [Filtros de conversas](https://trello.com/c/Z5X0kXG5) |

## Implementação no repositório

- A Agenda oferece criação e edição de compromissos, participantes e validação de conflitos. Os módulos da agenda concentram seus modelos e endpoints no backend, com a interface em `frontend/components/`.
- O domínio de avisos está em `backend/avisos/`; a interface de avisos é apoiada por `frontend/components/` e `frontend/lib/avisos.ts`. A HU 28 tem contrato específico em [hu-28-draft-notices.md](hu-28-draft-notices.md): salvar rascunho não publica o aviso, os rascunhos são privados ao autor e a publicação é um fluxo separado.
- A área de Chats usa o backend Django e a interface React; o contrato de acesso e os filtros locais estão descritos em [FILTRO_CONVERSAS.md](FILTRO_CONVERSAS.md). Esse documento registra atualização a cada 15 segundos e limitação da busca local para históricos volumosos.
- As histórias HU 26 a 32 são escopos da Sprint 04, mesmo quando as funcionalidades existentes já serviam de base antes da sprint. O escopo do cartão, a implementação testada e a conclusão formal não devem ser confundidos.

## Validação restante

- Confirmar no ambiente publicado o fluxo integrado de criação de reunião, participantes, agenda e avisos, com papéis autorizados e cenários de falha.
- Para a HU 28, executar a migração Django e os testes indicados em [hu-28-draft-notices.md](hu-28-draft-notices.md), inclusive persistência, isolamento entre autores, recuperação após falha e ausência de rascunhos nos feeds publicados.
- Para HU 31 e HU 32, executar os testes da API em `backend/chats/tests.py` e os testes de interface em `frontend/tests/conversas.spec.ts`, complementando-os com o teste integrado em PostgreSQL.
- Anexar evidências de execução real (incluindo screencast) e conferir cada critério de aceite com os responsáveis. **Este documento não declara nova execução de testes nem homologação final em produção.**
