# Validação da HU3 — prazo da demanda

Data: 21/10/2026. Branch: `feature/hu-3-prazo-demanda`.

## Problemas reproduzidos e corrigidos

- Filtros de prazo dependiam de conversão de fuso pelo PostgreSQL. Agora usam
  limites calculados em Python, início inclusivo e início do dia seguinte exclusivo.
- A migração com registros existentes falhava no PostgreSQL com referências
  pendentes antes de ALTER TABLE. As referências são verificadas antes da
  alteração de estrutura, mantendo a migração atômica e reversível.
- Uma tela desatualizada podia sobrescrever outra edição. Os formulários enviam
  a versão lida e recebem 409 em caso de conflito. A ação de prazo oferece
  recarregar os dados. A versão avança mesmo com relógio congelado.
- Editar outro campo podia reenviar um prazo antigo e truncar seus segundos.
  O formulário geral omite o prazo quando não foi editado; salvar sem mudar
  o horário preserva o timestamp original, inclusive frações.
- A atualização do prazo revalidava a equipe principal atual de pessoas em
  registros antigos, bloqueando vínculos legítimos com múltiplas equipes.
  A ação agora atualiza apenas prazo/versão após conferir acesso pela equipe ativa.
- A edição geral do prazo agora inclui os valores anterior e novo no histórico.

## Resultado

| Verificação | Resultado |
| --- | --- |
| Backend completo em PostgreSQL 16.15 | 125 testes aprovados |
| Backend completo em SQLite temporário | 124 aprovados; 1 teste de bloqueio concorrente ignorado porque SQLite não oferece SELECT FOR UPDATE |
| Navegador Microsoft Edge | 29 testes aprovados |
| TypeScript e Oxlint | Aprovados |
| Build do frontend | Aprovado |
| Migrações faltantes | Nenhuma detectada |

O PostgreSQL foi baixado dos binários oficiais da EDB para uma instância
isolada em `.local/hu3-postgres`, porta 55433, somente em 127.0.0.1. Não foi
instalado serviço do Windows. Os testes criaram e removeram seu próprio banco.
A instalação usada na revisão externa não foi encontrada nesta máquina; esta
validação usa uma instância nova, sem alterar banco institucional ou de produção.

Os testes de prazo no navegador usam `Pacific/Honolulu` para verificar que
entrada e exibição continuam seguindo `America/Fortaleza`. A suíte do navegador
simula a API; a suíte de backend exercita a API real com PostgreSQL, incluindo
sessão/CSRF e concorrência entre duas conexões.

## Cobertura de casos de falha

- Inspetor responsável, outro inspetor, gestor, gestor externo e equipe participante.
- Equipe ativa diferente da principal e mudança de equipe do criador histórico.
- Demanda concluída/cancelada, responsável trocado e retirada de participação.
- Sessão ausente, CSRF ausente e conta desativada.
- Payload de tipo errado, campos extras, campos ausentes e valores inválidos.
- Datas impossíveis, horários/offsets inválidos, extremos de calendário e UTC equivalente.
- Primeiro/último instante do dia, limite do dia seguinte e filtros com uma só ponta.
- Reenvio sem alteração, falha na gravação do histórico e rollback do prazo.
- Duas edições simultâneas, versão desatualizada e relógio congelado.
- Migração de dados existentes, data bissexta e reversão preservando o dia local.
- Erro de salvamento, recuperação de conflito, persistência após recarregar e ações ocultas sem permissão.

## Repetir no PostgreSQL isolado (PowerShell, pasta backend)

```powershell
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_PORT = '55433'
$env:POSTGRES_USER = 'hu3_test'
$env:POSTGRES_PASSWORD = ''
$env:POSTGRES_DB = 'postgres'
.\.venv\Scripts\python.exe manage.py test --noinput
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Requer a instância de teste iniciada e um usuário autorizado a criar banco de
 teste. Não usar as configurações de teste em um servidor compartilhado.

## Limites conhecidos do contrato

Clientes antigos podem omitir `atualizada_em`; nesse caso a última gravação
vence. A proteção de conflito depende do envio da versão, como fazem os
formulários atuais. A migração reverte data/hora para data ao voltar à versão
anterior, preservando o dia local; o horário deixa de existir nesse esquema.
Datas passadas são permitidas pela HU3 e exibidas como atrasadas. Os testes
cobrem os casos listados; não constituem prova de ausência de qualquer defeito.
