# Workspace: security-center

## Ownership

- Owner branch: `frontend/security-center`
- Scope: Security Center frontend.

## Purpose

This workspace will host the Security Center UI — a dedicated view for security
administrators to monitor platform health, alerts, events, risk posture, and
security settings. It is intentionally empty in the V1 foundation; no `security-center`
routes exist yet.

## Planned primary routes

- `/security`
- `/security/alerts`
- `/security/events`
- `/security/risk`
- `/security/settings`

## What is allowed here (once built)

- Security Center pages and their components.
- Alerts / events / risk / settings screens for security admins.

## What is NOT allowed here

- The admin console pages under `/admin/security*` — those live in
  `src/features/holder-admin/` (admin console ownership) and must not be duplicated.
- Fraud / tampering / attack-simulation UI — that lives in `src/features/fraud-tampering/`.
- Direct `fetch()` calls — use `services/api/*`.
- Duplicates of shared components — reuse `components/ui/*`.

## Shared code

- Reuse `components/ui/*` (canonical), `components/layout/*`, `components/shared/*`,
  `services/api/*`, `services/mock/*`, `hooks/*`, `types/*`, `utils/*`, `constants/*`.
- If you need a new shared component, extend the canonical one in `components/ui/` —
  do not create a second copy here.

## OpenCode safety

When opencode works in this workspace, it may edit files under
`src/features/security-center/**` only. It must not touch other feature workspaces,
`src/app/router/AppRoutes.tsx` without a specific request, or shared infrastructure
unless asked.