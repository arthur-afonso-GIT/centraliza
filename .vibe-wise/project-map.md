# Project Map

## Purpose
Centraliza coordinates VISAT demands, assignments, inspection progress, agenda, notices and teams.

## Requirements
- Every new demand must have a SEI receipt/process number; current data is fictitious.
- The first mock pre-fills the SEI number and institution demandante. The learner chose to store demandante in the existing `Demanda.origem` field, with a clearer product label; no new demand field is needed.
- Duplicate creation must be blocked globally by process number. A manager from another team may see only the SEI process number, demand title and origin (institution demandante) and request their team's participation; full detail/history/attachments are unavailable before approval. Any manager of a team already participating may approve/reject via a pending request.
- Demonstrate user-triggered capture from a mock SEI process page by browser extension, with visible-field suggestions and manager confirmation.
- No SEI API access or institutional page access is available now.
- Task-completion rate is a desired operational success measure; its exact formula remains undecided.
- Closing the prefilled Centraliza tab without saving discards unsaved work.

## Components
- Frontend React/TypeScript/vinext: `frontend/components/demanda-form.tsx`, `frontend/components/importar-sei.tsx`, `frontend/lib/demandas.ts`.
- API Django/DRF: `backend/config/urls.py`, `backend/demandas/views.py`, `backend/demandas/serializers.py`, `backend/demandas/services.py`.
- Data PostgreSQL: `backend/demandas/models.py` has `Demanda` and `ImportacaoSei`; migrations in `backend/demandas/migrations/`.
- Existing parser and normalization: `backend/demandas/importacao_sei.py`, `backend/demandas/identidade_sei.py`.
- Existing browser tests: `frontend/tests/gerenciar-demandas.spec.ts`; API tests: `backend/demandas/tests.py`.
- Proposed only: mock SEI page, browser extension and bridge to preview; no implementation exists yet.

## Main Flow
Implemented: manager form or copied fictitious text → frontend API adapter → Django preview/validation → explicit confirmation → demand and history in PostgreSQL.

Confirmed design: mock SEI page → extension identifies visible fields → manager clicks Enviar → a distinct new Centraliza demand-entry tab for that capture (login first if needed; no access to other tabs) → extension delivers only to that tab → tab-scoped temporary storage during login/review → Centraliza makes authenticated API duplicate/preview request → prefilled form or existing-demand summary → manager corrects and saves if new → API creates demand. Saving/canceling clears the capture; closing the tab loses unsaved work. Exact messaging mechanism remains an implementation detail to choose before coding.

## Data and Trust Boundaries
- Django session and CSRF protect writes; request user/team scope is enforced in API views.
- Extension would read a separate page; its output is untrusted input, even in a mock.
- `ImportacaoSei` currently stores temporary raw text up to 24 hours and clears it on confirmation, discard or expired access; unattended expiration cleanup is not verified.
- No institutional SEI credentials, cookies or full documents are in scope.

## Build and Deployment
- Backend: `backend/pyproject.toml`, Django 5.2/DRF 3.16, PostgreSQL; `python manage.py test`.
- Frontend: `frontend/package.json`, React 19, vinext; `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`.
- `frontend/vite.config.ts` proxies local `/api` to Django. Real deployment and extension distribution are undecided.

## Unknowns
- The mandatory identifier is the SEI process number; ambiguity or failure to identify it triggers a warning and manual entry. The actual institutional markup remains unknown.
- Brave is the first browser target. The chosen prototype handoff is a new-tab-ID-targeted delivery into a Centraliza receiving page, then `sessionStorage` in that tab through login; Centraliza owns the authenticated API call. Structured-preview endpoint shape and exact cleanup/error behavior remain implementation details.
- Duplicate-process rule and long-term cleanup/retention.
- Institutional page markup and allowed visible fields, pending anonymized examples and authorization.
- Completion-rate denominator and observation period.
