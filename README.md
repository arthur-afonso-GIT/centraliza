# Centraliza

<p align="center">
  <img src="assets/centraliza-logo.png" alt="Centraliza VISAT logo" width="450">
</p>

A shared workspace for Occupational Health Surveillance (VISAT).
Request management, team coordination, and traceability throughout the inspection workflow.

---

## Overview

Centraliza is a web application project for organizing the daily work of VISAT managers and inspectors. Its goal is to bring requests, deadlines, activity records, meetings, and internal communication into one platform.

VISAT receives requests from institutions such as the Public Labor Prosecutor's Office (MPT), the Regional Labor Court (TRT), health councils, and labor unions. Centraliza is intended to help the team follow these requests from assignment through execution and management review.

The repository currently provides an interactive navigation prototype. Operational request management, the Python back-end, and PostgreSQL integration are still under development.

## Core capabilities

Available in the prototype:

- **Responsive workspace** — shared layout and navigation across Home, Agenda, Notices, Requests, and Chats.
- **Role previews** — enter as a fictitious manager or inspector and explore the corresponding introductory content.
- **Session navigation** — redirect to the entry screen without a valid demo session, preserve the session across reloads, and sign out.
- **Accessible interaction** — keyboard navigation, visible focus, a skip-to-content link, descriptive page titles, and checked color contrast.
- **Recovery states** — loading feedback, retry after browser-storage failures, and a page-not-found screen.

Planned operational capabilities:

- **Request management** — create, prioritize, assign, reassign, cancel, and monitor deadlines.
- **Inspection execution** — accept work, update progress, and attach documents and evidence.
- **Management review** — approve completed activities or request corrections, with a traceable history.
- **Team planning and communication** — schedule meetings, identify conflicts, publish notices, and exchange messages.
- **Monitoring** — summarize pending work, overdue requests, critical activities, and team progress.

## Team workspace

The product is designed around two roles. The table describes their intended responsibilities; the prototype currently simulates their entry and navigation only.

| Role | Intended responsibilities |
| --- | --- |
| Manager (Gestor) | Organize the team's requests, set priorities and deadlines, assign inspectors, evaluate completed activities, and coordinate meetings and notices. |
| Inspector (Inspetor) | Follow assigned requests, record progress and evidence, submit activities for review, and consult meetings and team communication. |

The planned workflow is assignment, acceptance, execution, management review, and completion. Requests requiring corrections return to execution before a new review.

## Project documentation

The interface and supporting project documents use Brazilian Portuguese:

- [Project website](https://sites.google.com/cesar.school/g3-projetos2/kick-off) — academic context and project presentation.
- [User stories](https://docs.google.com/document/d/16kUCRMTKoWA6baSPuiB9Tu2W-Y0lDQZfsuvdFY4LZjo/edit?usp=sharing) — proposed user needs.
- [Backlog](https://docs.google.com/document/d/1xlQBoN-2C-LtF59Zb2HhzJUCzOO1bQ3bnZY_P2gJNrY/edit?usp=sharing) — planned features.
- [Development plan](docs/plano-desenvolvimento.md) — tasks, validation process, and Graphify usage.
- [Navigation and session contract](docs/semana-1.md) — prototype scope and proposed authentication endpoints.
- [Technical validation](docs/validacao-semana-1.md) — test coverage, evidence, and limitations.
- [Visual palette](docs/paleta-visual.md) — red, graphite, and white identity with accessible supporting tones.

## Screenshots

### Home

![Centraliza manager home with the red and graphite palette](docs/evidencias/paleta/home-1366.png)

### Mobile navigation layout

<p align="center">
  <img src="docs/evidencias/paleta/home-390.png" alt="Centraliza mobile home" width="320">
</p>

These screenshots show the local prototype. The previously published demonstration may not include the latest repository changes.

## Technology stack

| Area | Technologies and status |
| --- | --- |
| Web interface | React, TypeScript, Vinext/Vite |
| Styling and icons | CSS, Tailwind CSS, Lucide; shadcn components supplied by the starter |
| Demo session | Browser sessionStorage, isolated behind an authentication adapter |
| Validation | Playwright, axe-core, TypeScript, Oxlint |
| Architecture mapping | Graphify local AST extraction |
| Demo build | Sites starter with Cloudflare Workers build output; Node for local development |
| Planned back-end | Python with Django and Django REST Framework; not implemented |
| Planned database | PostgreSQL; not connected |

## Architecture

```text
centraliza/
├── frontend/
│   ├── app/               Routes, metadata, global styles, and error pages
│   ├── components/        Entry screen, workspace layout, and module content
│   ├── hooks/             Demo session lifecycle
│   ├── lib/               Authentication adapter and navigation configuration
│   ├── public/            Browser assets
│   └── tests/             Navigation, session, and accessibility checks
├── assets/                Project identity
├── docs/                  Planning, contracts, validation, and visual references
└── graphify-out/           Versioned code graph
```

Workspace coordinates session state and chooses the appropriate screen. The session hook calls the adapter in frontend/lib/auth.ts; layout and module components handle presentation. This separation provides a place to connect the future API without embedding storage logic in each page.

The intended server architecture is a modular Python application backed by PostgreSQL. Business rules, authorization, and audit records will be enforced there when the operational modules are implemented.

## Local development

Requirements: Node.js 22.13 or later and npm.

```powershell
cd frontend
npm ci
npm run dev
```

Open the address printed by the terminal, normally http://localhost:3000. Choose **Gestor** or **Inspetor** to enter without a password. Use **Sair da demonstração** to switch roles. The demo session is stored in the current browser tab and survives page reloads.

Run checks from frontend:

```powershell
npm run lint
npm run typecheck
npm run build
npm test
```

Browser tests use an installed Microsoft Edge. Adjust the channel in frontend/playwright.config.ts for another environment. Generated starter components in components/ui and hooks/use-mobile.ts are excluded from the application lint configuration.

For code exploration, run graphify explain Workspace from the repository root. After source changes, run graphify update . --no-cluster to refresh graphify-out/graph.json. This mode analyzes code locally and does not send it to an external model.

## Data and security

- The prototype contains fictitious roles and does not connect to institutional records.
- Browser route guards and a demo session are not production authentication or authorization.
- The future API must enforce permissions, validate operations, and keep the request history consistent.
- Real deployment requires dependency-security review, authenticated storage, database setup, and agreement on operational access rules with VISAT.

## Product direction

The next development stage is to define the request data model and role permissions, then connect the interface to the Python API and PostgreSQL. Implementation will prioritize one complete request lifecycle before expanding agenda, notices, and chat.

## Team

| Member | Role | Contact |
| --- | --- | --- |
| Antônio Marcos Soares de Araujo Filho | Developer | [LinkedIn](https://www.linkedin.com/in/antonio-m-29aa4a3b0/) |
| Arthur Florêncio Afonso de Albuquerque | Solutions Architect | [LinkedIn](https://www.linkedin.com/in/arthur-flor%C3%AAncio-afonso/)<br>[arthurafonsodev@gmail.com](mailto:arthurafonsodev@gmail.com) |
| Cecília de Moraes Andrade Oliveira | UX Designer | [LinkedIn](https://www.linkedin.com/in/ceciliademoraesa) |
| Lívia Cabral da Mata Buonora | Project Manager | [LinkedIn](https://www.linkedin.com/in/l%C3%ADvia-buonora-381294365/) |
| Luiza Beltrão Pereira de Melo | Researcher | [LinkedIn](https://www.linkedin.com/in/luiza-beltr%C3%A3o-pereira-de-melo/) |
| Silvio Ronaldo de Lima Lobo Filho | Product | [LinkedIn](https://www.linkedin.com/in/silvio-lobo-a836b6393/) |
| Victor Bacelar Palazzin | UX Researcher | [LinkedIn](https://www.linkedin.com/in/victor-bacelar-palazzin-a444a23b0/) |
