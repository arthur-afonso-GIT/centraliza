# Descoberta da entrada assistida do SEI — Ciclo 0

## Finalidade

Registrar fatos confirmados, decisões, perguntas e evidências necessárias antes
de alterar o modelo de demandas. Este documento evita que formato, permissão ou
comportamento do SEI sejam presumidos durante o desenvolvimento.

O Ciclo 0 não acessa dados institucionais, não automatiza o SEI e não modifica o
fluxo operacional existente do Centraliza.

## Situação do ciclo

**Em andamento.** A análise do Centraliza e as decisões técnicas iniciais estão
registradas. A conclusão depende de exemplos anonimizados e da validação das
regras pela equipe.

## Fatos confirmados no Centraliza

| Fato | Evidência local |
| --- | --- |
| Cada demanda possui ID interno numérico | `backend/demandas/models.py` |
| Demandas pertencem a uma equipe | `Demanda.equipe` |
| Gestores veem demandas da própria equipe | `demandas_permitidas` |
| Inspetores veem apenas demandas atribuídas a eles | `demandas_permitidas` |
| Apenas gestores criam, editam, atribuem e cancelam demandas | serviços e views de demandas |
| Inspetores executam e enviam demandas atribuídas para avaliação | matriz `REGRAS` |
| Alterações relevantes produzem eventos de histórico | `EventoDemanda` |
| O sistema ainda não possui campos, parser ou captura do SEI | modelos e endpoints atuais |
| A extensão e o chat não fazem parte do núcleo operacional atual | código e plano pós-MVP |

## Decisões registradas

### D-001 — Identidade interna

O ID do Centraliza continuará sendo a chave primária. O número do processo SEI
será um identificador externo normalizado, pesquisável e sujeito a uma regra de
unicidade ainda a ser aprovada.

### D-002 — Entrada progressiva

A primeira entrega recebe texto copiado pelo usuário. Uma extensão de navegador
poderá preencher a mesma prévia posteriormente. Os dois canais usarão os mesmos
serviços de normalização, validação, duplicidade e confirmação.

### D-003 — Confirmação humana

Captura e interpretação geram uma prévia temporária. Somente uma confirmação
explícita cria ou associa uma demanda.

### D-004 — Limite da captura

A extensão não acessará senha, cookie, documento ou página completa do SEI. Ela
capturará apenas campos aprovados, em domínio autorizado, mediante ação do
usuário.

### D-005 — Autoridade dos campos

Dados externos não sobrescreverão responsável, prioridade, criticidade, prazo
operacional, status, comentários, anexos ou avaliações do Centraliza.

## Catálogo provisório de campos

Nenhum campo marcado como pendente deve entrar em migração antes da validação.

| Campo candidato | Finalidade | Situação | Observação a validar |
| --- | --- | --- | --- |
| Número formatado do processo | Identificação visível e busca | Campo visível confirmado | Formatos completos realmente utilizados |
| Número normalizado | Comparação e duplicidade | Derivado proposto | Regra de remoção de pontuação |
| ID técnico do procedimento | Referência externa opcional | Pendente | Se aparece ou pode ser obtido |
| Tipo do processo | Classificação externa | Pendente | Nome e estabilidade do campo |
| Especificação ou assunto | Apoio ao título da demanda | Pendente | Qual rótulo aparece no SEI |
| Unidade | Contexto institucional | Pendente | Unidade atual, geradora ou ambas |
| Data de autuação | Metadado do processo | Pendente | Formato e disponibilidade |
| Interessado | Contexto opcional | Pendente | Necessidade e autorização |
| Link do processo | Atalho para sessão do usuário | Pendente | Estabilidade e ausência de segredo |
| Origem da captura | Auditoria | Obrigatório proposto | Manual, texto ou extensão |
| Data da confirmação | Auditoria | Obrigatório proposto | Horário do Centraliza |

## Matriz inicial de perfis

Esta matriz descreve o comportamento atual e apresenta decisões que precisam de
validação. Ela não cria novas permissões por si só.

| Ação | Gestor atual | Inspetor atual | Decisão pendente |
| --- | :---: | :---: | --- |
| Ver demandas da equipe | Sim | Não | Manter |
| Ver demanda atribuída | Sim | Sim | Manter |
| Criar demanda manual | Sim | Não | Manter ou permitir sugestão do inspetor |
| Colar dados e gerar prévia | — | — | Definir perfis autorizados |
| Confirmar nova demanda | — | — | Recomendação inicial: gestor |
| Associar captura a demanda existente | — | — | Definir perfis autorizados |
| Corrigir campos externos | — | — | Definir campos e perfis |
| Executar demanda | Não | Responsável | Manter |
| Avaliar e concluir | Sim | Não | Manter |
| Administrar equipe e contas | — | — | Definir administrador ou permissão |
| Consultar auditoria | — | — | Definir escopo por equipe |
| Exportar dados | — | — | Definir perfis, colunas e registro |

## Regra de unicidade a decidir

Escolher uma das opções somente após confirmar o fluxo institucional:

1. **Global:** um número SEI existe uma única vez em todo o Centraliza.
2. **Por equipe:** o mesmo número pode aparecer em equipes diferentes.
3. **Processo compartilhado:** existe uma demanda principal relacionada a mais
   de uma equipe.

A terceira opção evita duplicidade de conteúdo, mas exige rever o modelo atual,
no qual uma demanda pertence a exatamente uma equipe.

## Amostras necessárias

Fornecer entre três e cinco exemplos de processos com variações relevantes:

- processo comum;
- processo com assunto ou especificação extensa;
- processo com mais de uma unidade ou interessado, se existir;
- processo que represente uma exceção conhecida;
- texto copiado em navegadores usados pela equipe, caso haja diferença.

### Como anonimizar

Antes de compartilhar, substituir:

- nomes de pessoas por `PESSOA EXEMPLO`;
- CPF, telefone, e-mail e matrícula por valores fictícios;
- nomes de empresas por `INSTITUIÇÃO EXEMPLO`;
- conteúdo clínico, trabalhista ou sigiloso por `[CONTEÚDO REMOVIDO]`;
- número real do processo por um número fictício com o mesmo formato.

Manter rótulos, ordem dos campos, pontuação e quebras de linha. Esses elementos
são necessários para desenvolver e testar o parser.

### Modelo de envio

```text
AMOSTRA 1 — tipo de página ou situação

[colar aqui o texto já anonimizado]

Campos que a equipe espera aproveitar:
- número:
- assunto ou especificação:
- tipo:
- unidade:
- data:
- outros:
```

Capturas de tela somente devem ser usadas quando o texto copiado não preservar
os rótulos necessários. Nesse caso, anonimizar visualmente antes do envio.

## Evidência recebida

### A-001 — Tela de pesquisa do SEI

**Recebida em:** 14/09/2026  
**Tipo:** captura de tela de uma interface de pesquisa  
**Uso permitido neste plano:** referência visual; não tratada como contrato de
HTML, formato definitivo ou evidência de integração disponível.

A imagem confirma visualmente:

- seleção entre pesquisa de processos e documentos;
- filtros para documentos gerados e externos;
- campos de órgão gerador, unidade geradora, assunto, assinatura ou
  autenticação, contato, especificação ou descrição e observação da unidade;
- opções de interessado, remetente e destinatário;
- um campo identificado como `Nº SEI` para processo ou documento;
- ação explícita `Pesquisar`.

A imagem não permite confirmar:

- o formato completo aceito para todos os números de processo;
- quais campos aparecem no resultado ou no detalhe do processo;
- quais valores podem ser copiados como texto;
- IDs, classes ou estrutura HTML utilizáveis pela extensão;
- se o número exibido é fictício, parcial, de processo ou de documento;
- quais dados a VISAT está autorizada a transferir ao Centraliza.

Para o parser da primeira versão, ainda é necessária uma amostra de texto
copiado. Para a extensão futura, será necessária uma página de resultado ou de
detalhe anonimizada; a tela de pesquisa sozinha não contém os metadados finais
da demanda.

## Perguntas para a equipe

### Processo e dados

1. Qual instalação e versão do SEI são utilizadas?
2. Qual tela será a fonte da captura?
3. Quais campos são indispensáveis para abrir uma demanda?
4. O prazo da VISAT vem do SEI ou é definido internamente?
5. O título deve copiar o assunto ou ser escrito pela equipe?
6. O link do processo continua válido entre sessões e usuários?

### Unicidade e equipes

7. Um processo pode gerar mais de uma demanda da VISAT?
8. Um processo pode envolver mais de uma equipe?
9. Se duas equipes recebem o mesmo processo, devem compartilhar histórico?
10. Quem resolve uma possível duplicidade?

### Permissões

11. Inspetores podem sugerir uma demanda a partir do SEI?
12. Quem pode confirmar uma nova demanda?
13. Quem administra contas e transferências entre equipes?
14. Quem pode exportar dados e consultar auditoria?

### Retenção e segurança

15. Por quanto tempo uma prévia não confirmada pode permanecer armazenada?
16. Quais campos não podem sair do SEI?
17. A extensão de navegador pode ser instalada nos equipamentos institucionais?
18. Qual área autoriza e audita essa instalação?

## Critérios para encerrar o Ciclo 0

- [x] Decisões técnicas iniciais documentadas.
- [x] Comportamento atual de perfis e equipes inventariado.
- [x] Catálogo provisório de campos criado.
- [x] Procedimento de anonimização definido.
- [x] Uma referência visual da pesquisa recebida e analisada.
- [ ] Três a cinco amostras anonimizadas recebidas.
- [ ] Campos obrigatórios e proibidos aprovados.
- [ ] Regra de unicidade aprovada.
- [ ] Matriz de perfis aprovada.
- [ ] Política de retenção da prévia aprovada.
- [ ] Viabilidade institucional da extensão registrada.

## Saída para o Ciclo 1

Quando os itens pendentes forem aprovados, converter as decisões em:

1. contrato do número do SEI;
2. normalizador com casos de teste;
3. migração reversível de demanda;
4. regra de unicidade no serviço e no PostgreSQL;
5. dados fictícios de demonstração;
6. apresentação e busca do número na interface.
