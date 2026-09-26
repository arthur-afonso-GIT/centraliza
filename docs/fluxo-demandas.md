# Fluxo operacional das demandas

## Estados

| Estado | Significado |
| --- | --- |
| `pendente` | Aguardando atribuição ou aceite do inspetor indicado |
| `aceita` | Inspetor confirmou recebimento e responsabilidade; execução ainda não iniciada |
| `em_andamento` | Atividade em execução pelo responsável |
| `aguardando_avaliacao` | Inspetor enviou o trabalho para análise da gestão |
| `em_correcao` | Gestor devolveu o trabalho com uma justificativa |
| `concluida` | Gestor aprovou a entrega |
| `cancelada` | Gestor interrompeu a demanda com uma justificativa |

## Matriz de transições

| Origem | Destino | Perfil | Texto obrigatório |
| --- | --- | --- | --- |
| Pendente | Aceita | Inspetor responsável | Não |
| Aceita | Em andamento | Inspetor responsável | Não |
| Em andamento | Aguardando avaliação | Inspetor responsável | Resumo da entrega |
| Em correção | Aguardando avaliação | Inspetor responsável | Resumo da correção |
| Aguardando avaliação | Concluída | Gestor da equipe | Não |
| Aguardando avaliação | Em correção | Gestor da equipe | Justificativa |
| Pendente, aceita, em andamento, aguardando avaliação ou em correção | Cancelada | Gestor da equipe | Justificativa |

Estados concluído e cancelado são terminais neste MVP. Reabertura exige uma
regra institucional futura. Toda transição ocorre em transação, bloqueia a linha
da demanda, atualiza o estado e cria um evento de histórico com o mesmo autor.
Tentativas inválidas não alteram a demanda nem criam eventos.

## Aceite — história 7

Referência: [Histórias do usuário no Notion](https://www.notion.so/3c73d03a0b9e8040afc1dff24a3e2bc8).

A atribuição mantém a demanda pendente. O gestor vê “Aguardando aceite” e
somente o inspetor responsável pode selecionar “Aceitar demanda”. O evento de
aceite registra autor, data e horário. Depois disso, uma ação separada,
“Iniciar demanda”, registra o início da execução, conforme a história 8.
A API impede pular o aceite e rejeita confirmações repetidas sem duplicar eventos.

A lista oferece o segmento “Aceitas”. Demandas aceitas continuam nas listas
ativas, no dashboard e na carga de trabalho. Demandas pendentes sem responsável
exibem “Aguardando atribuição”.

Trocar ou remover o responsável de uma demanda ativa devolve seu status a
`pendente`, preservando o histórico anterior. O novo inspetor precisa aceitar;
edições de outros campos e a manutenção do mesmo responsável preservam o aceite.
Demandas já em execução antes desta atualização mantêm seu estado, sem criação
de aceites retroativos.

## Correções — história 14

Na avaliação, o gestor pode aprovar a entrega ou solicitar correções com
justificativa obrigatória. Em correção, o detalhe destaca a orientação mais
recente, seu autor e sua data. O inspetor registra o resumo dos ajustes e usa
“Reenviar para avaliação”. O processo pode repetir-se sem apagar o histórico.

As etapas aparecem no detalhe e cada estado tem identificação textual. A lista
inclui filtros para aceitas, em andamento, em avaliação, em correção, concluídas
e canceladas, além das pendentes e críticas.
