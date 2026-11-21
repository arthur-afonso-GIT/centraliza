# HU 28 — Draft notices

Inspectors and coordinators (`gestor` in the application) can open **Avisos → Meus rascunhos → Novo rascunho**, enter a title and content, and save their work. Saved drafts can be reopened and edited after reloading the page. A failed save preserves the text, and closing a modified editor asks before discarding unsaved changes.

Drafts are private to their author within the active team. They are stored separately from published notices and never appear in the notice feed, home dashboard, recipient lists, or reading confirmations. This story covers drafting and author review; publishing a draft is a separate workflow and is not triggered by saving. Existing notice publication remains unchanged.

## API

- `GET /api/avisos/rascunhos/`: list the current author's drafts in the active team, most recently updated first.
- `POST /api/avisos/rascunhos/`: create a draft with `titulo` (required, maximum 200 characters) and `conteudo` (required).
- `GET /api/avisos/rascunhos/{id}/`: retrieve an owned draft.
- `PATCH /api/avisos/rascunhos/{id}/`: update its title and/or content.

Authentication and an active team context are required. Other authors' drafts return 404. The server assigns author and team; extra fields, including publication fields, are rejected.

## Deployment and validation

Apply the new Django migration with `python manage.py migrate` from the backend environment before using this feature. It adds a draft table without changing existing notices.

Backend coverage: `python manage.py test avisos` (including persistence, permissions, validation, team isolation and absence from published feeds).

Frontend coverage: `npm test -- rascunhos-avisos.spec.ts avisos.spec.ts gerenciar-avisos.spec.ts leitura-avisos.spec.ts`. Draft tests exercise both roles, reload/edit, save failure/retry, mobile layout and accessibility, with a mocked API. They do not replace a deployment check against PostgreSQL.
