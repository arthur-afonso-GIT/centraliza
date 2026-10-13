# Learning Progress

## Implementation in progress
- Continued implementation: cross-team participation requests and decisions, a dedicated tab-scoped SEI review route, local mock pages, and a Brave extension were added. PostgreSQL local migrations 0011 and 0012 were applied after safely filling all 1,000 identified seed-v1 demo rows with deterministic fictitious SEI numbers; zero blank and zero duplicate numbers remain.
- Final checks: 100 Django tests on PostgreSQL, 56 Playwright browser scenarios, frontend typecheck/lint/build, and four extension unit tests passed. Automated Brave smoke verified the popup reads the mock page, opens one new Centraliza tab, and retains both fields through real login with a fictitious local account. The frontend and API were left running locally for review.
- The learner authorized starting implementation on 2026-10-10. Phase 1 began with required SEI numbers, global normalized uniqueness, restricted global duplicate lookup, and clearer frontend labels. The participation request and extension remain upcoming stages.
- Backend verification: 78 Django tests passed against a temporary SQLite database. The local PostgreSQL service on port 55432 did not respond in this session; migration 0011 has been generated but not applied there.
- Frontend TypeScript check and two targeted browser tests passed.
- Known product requirements: extension-based mock, number mandatory for every new demand, suggestions from visible fields, manager confirmation, no real SEI API or live page access.
- Learner-proposed behavior: on entering the page, a scraper identifies principal fields. The extension offers an Enviar action that fills fields in Centraliza; correction and final creation happen in Centraliza, not in the extension.
- Learner chose that Enviar opens a new Centraliza tab; if there is no session, it shows login first. Still unresolved: how the capture persists until the form opens after login.
- Learner chose that closing the unsaved tab loses progress. After considering browser-tab storage versus an API draft, chose temporary storage in the Centraliza tab during login and review; no backend draft.
- Learner specified one capture opens one new demand-entry tab; the extension must not fill or access other existing Centraliza tabs.
- Design checkpoint confirmed by the learner: deliver only to the newly opened tab, retain capture in that tab through login, and clear it on save/cancel; closing the tab loses unsaved work. This confirms design direction, not authorization to implement code.
- Learner chose automatic prefill of two fields for the first mock: SEI number and demandante. Current `Demanda` has `origem` but no dedicated `demandante` field; their meaning must be distinguished before design.
- Learner defined demandante as the institution that makes the request. The earlier correction-in-Centraliza rule is understood to apply to prefilled fields unless changed.
- Learner chose to use the existing `Demanda.origem` as the institution demandante; no separate field is needed for the mock. The display label may be clarified while preserving the storage/API field name.
- Learner wants the SEI process number for the demand. If extraction cannot identify it reliably, show a warning and require manual entry rather than choosing a document number.
- Learner chose one demand per SEI process: duplicate creation must be blocked, and a manager with access should be redirected to the existing demand for that number.
- Learner chose global process identity across teams: a manager finding an existing demand from another team may view it and request their team's participation. Current code grants full manager access only after team participation is configured by an administering manager; there is no request/approval workflow.
- Before approval, an outside manager may see only enough information to recognize the process; history, attachments and full details remain inaccessible. Exact summary fields remain to be specified.
- Learner wants a GitHub-style pending request with approve/reject actions and says any manager can decide it. The permission scope of "any manager" requires clarification before it is recorded as a security rule.
- Learner clarified that any manager of a team already participating in the demand may approve/reject. Managers with no participating team cannot decide requests. The request appears as a pending approval with accept/reject actions.
- Learner chose the pre-approval summary fields: SEI process number, demand name/title, and origin (institution demandante). No description, history or attachments before approval.
- Learner proposed that the extension sends a registration request to the API, which checks for duplicates and, if none, adds fields to the interface for confirmation. Clarification needed: API returns data and cannot directly update UI; registration must occur only after confirmation. Authenticated request origin (extension vs newly opened Centraliza tab) remains unresolved.
- Learner chose the extension to deliver only captured fields to the new Centraliza tab. Centraliza, after login, makes the authenticated API request for duplicate lookup/preview and renders the result; creation remains after manager confirmation.
- Learner chose Brave as the only required browser for the first mock demonstration. Other browsers remain future compatibility work.
- After learner said they did not know which technical mechanism is best, Codex investigated official Brave/Chromium extension and tab-storage documentation and proposed a tab-ID-targeted one-time delivery into a dedicated Centraliza receiving tab, then tab-scoped `sessionStorage` across login. Learner responded positively ("legal"); adopted for the prototype, with browser compatibility and permissions still to verify during implementation. This confirms design, not code authorization.
- The proposal in `docs/DEV_PLAN.md` is not a confirmed architecture or authorization to implement code.

## Onboarding
- Existing repository and task purpose are known from the conversation.
- Onboarding complete. User knows the overall architecture but not the code in detail, wants to understand the whole system, reports intermediate programming experience, and is a beginner in the current frontend/backend stack. Uses default cadence: open-ended reasoning about meaningful decisions; Codex writes agreed code.
