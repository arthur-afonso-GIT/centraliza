# Fluxo operacional das demandas

## Estados

| Estado | Significado |
| --- | --- |
| `pendente` | Criada e atribuída, aguardando início pelo inspetor |
| `em_andamento` | Atividade em execução pelo responsável |
| `aguardando_avaliacao` | Inspetor enviou o trabalho para análise da gestão |
| `em_correcao` | Gestor devolveu o trabalho com uma justificativa |
| `concluida` | Gestor aprovou a entrega |
| `cancelada` | Gestor interrompeu a demanda com uma justificativa |

## Matriz de transições

| Origem | Destino | Perfil | Texto obrigatório |
| --- | --- | --- | --- |
| Pendente | Em andamento | Inspetor responsável | Não |
| Em andamento | Aguardando avaliação | Inspetor responsável | Resumo da entrega |
| Em correção | Aguardando avaliação | Inspetor responsável | Resumo da correção |
| Aguardando avaliação | Concluída | Gestor da equipe | Não |
| Aguardando avaliação | Em correção | Gestor da equipe | Justificativa |
| Pendente, em andamento, aguardando avaliação ou em correção | Cancelada | Gestor da equipe | Justificativa |

Estados concluído e cancelado são terminais neste MVP. Reabertura exige uma
regra institucional futura. Toda transição ocorre em transação, bloqueia a linha
da demanda, atualiza o estado e cria um evento de histórico com o mesmo autor.
Tentativas inválidas não alteram a demanda nem criam eventos.
