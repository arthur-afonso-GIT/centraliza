# HU — Criar uma reunião

Como Inspetor, quero criar uma reunião no sistema, para agendar um momento de
alinhamento sobre as demandas.

## Decisão de escopo

Até esta HU, somente gestores criavam compromissos. O inspetor passa a agendar
**reuniões** em que ele próprio participa. Participantes adicionais, tipo
“Atividade” e vínculo com demanda continuam exclusivos da gestão, assim como
editar e cancelar compromissos. Isso preserva as regras da
[agenda gerenciável](validacao-agenda-gerenciavel.md) e não expõe a agenda de
outros inspetores.

## Comportamento

- Na Agenda, o inspetor vê o botão “Nova reunião”. O formulário pede título,
  data, horário de início, horário de término e pauta. Todos são obrigatórios.
  A data começa preenchida com o dia atual, e os horários seguem o fuso de
  Fortaleza.
- O término precisa ser posterior ao início. A interface avisa antes de enviar,
  e a API recusa o intervalo inválido.
- Ao salvar, a reunião é criada com o inspetor como participante. O calendário
  vai até a data da reunião e mostra “Reunião “título” agendada para dd/mm,
  hh:mm–hh:mm.”. A reunião aparece no dia e no horário informados.
- Se o horário se sobrepõe a outro compromisso do inspetor, a API retorna 409
  com os compromissos em conflito. O formulário mantém os dados para ajuste.
  Horários contíguos são permitidos.
- O gestor da equipe vê a reunião na agenda da equipe e pode editá-la ou
  cancelá-la como qualquer outro compromisso. Outros inspetores não a veem.

## API

`POST /api/compromissos/` com sessão de inspetor e CSRF recebe somente:

```json
{
  "titulo": "Alinhamento das demandas",
  "pauta": "Revisar prazos e prioridades da semana.",
  "inicio": "2026-09-25T14:00:00-03:00",
  "fim": "2026-09-25T15:30:00-03:00"
}
```

- `201`: compromisso do tipo `reuniao`, com `descricao` igual à pauta e o
  inspetor como único participante.
- `400`: campo ausente ou vazio, horário sem offset, término não posterior ao
  início, ou campo reservado à gestão (`participante_ids`, `tipo`,
  `demanda_id`).
- `403`: inspetor sem equipe ativa.
- `409`: conflito com a agenda do inspetor.

O fluxo do gestor no mesmo endpoint não muda. `PATCH` e `DELETE` de
compromissos continuam restritos à gestão. Nenhuma migração é necessária: a
pauta é gravada no campo `descricao` já existente.

Testes: `python manage.py test agenda` e
`npx playwright test tests/criar-reuniao.spec.ts`.

## Validação desta implementação — 18/11/2026

- Backend em **PostgreSQL 16**: 184 testes aprovados. 5 testes novos cobrem a
  criação e a exibição no calendário para o inspetor e o gestor, os campos
  obrigatórios e os intervalos inválidos, a recusa dos campos reservados à
  gestão, o conflito e os horários contíguos, e a exigência de sessão e
  equipe. Um teste existente foi ajustado: o POST do inspetor com campos da
  gestão agora retorna 400, e não mais 403, e PATCH e DELETE seguem com 403.
- Interface: 5 cenários Playwright novos (criação no horário correto, mudança
  para a semana da reunião, validação e conflito, ausência da ação para o
  gestor, acessibilidade em 390px). Suíte completa no Chromium: 102 cenários
  aprovados. Os 3 cenários de `andamento-demanda.spec.ts` já falhavam na
  `main` antes desta HU, porque esperam o botão “Aceitar demanda”.
- TypeScript, Oxlint e build de produção aprovados.
- A suíte não foi executada no Edge.
