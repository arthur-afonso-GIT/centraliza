# Team management contract

## Current scope

Every authenticated user can view the members and roles of their own team. Account management requires the explicit `pode_administrar_equipe` permission, which is disabled by default and valid only for managers attached to a team.

Authorized team managers can create accounts and update names, email addresses, roles, active status, and the team-management permission. Usernames are immutable after creation, passwords are never returned, and accounts are deactivated instead of deleted.

The API never permits cross-team management. An administrator cannot deactivate, demote, or remove their own administrative permission. An inspector with active assigned demands cannot be deactivated or changed to a manager until those demands are reassigned.

## Endpoints

- `GET /api/equipe/`: current team and its members.
- `POST /api/equipe/usuarios/`: create an account in the administrator's team.
- `PATCH /api/equipe/usuarios/{id}/`: update an account in the administrator's team.

Account creation requires an initial password with at least 12 characters and applies Django's configured password validation.
