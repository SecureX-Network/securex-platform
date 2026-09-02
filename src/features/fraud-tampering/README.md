# Workspace: fraud-tampering

## Ownership

- Owner branch: `frontend/fraud-tampering`
- Scope: Fraud / tampering / fingerprint-frontend UI.

## Purpose

This workspace will host the fraud & tamper-analysis frontend — UI to explore
tamper-evidence, fingerprint fraud indicators, and attack-simulation views. It is
intentionally empty in the V1 foundation; the `fraud-engine` backend
(`securex-fraud-engine`) does not exist yet, and no `fraud-tampering` routes exist.

## Planned primary route

- `/fraud/*`

## What is allowed here (once built)

- Fraud analytics / tamper-evidence pages and their components.
- Attack-simulation UI shared responsibility lives in
  `src/features/explorer-simulation/` for the simulation-heavy views; coordinate to
  avoid overlap.

## What is NOT allowed here

- Security Center admin views — those live in `src/features/security-center/`.
- Blockchain / network simulation — that lives in `src/features/explorer-simulation/`.
- Direct `fetch()` calls — use `services/api/*`.
- Duplicates of shared components — reuse `components/ui/*`.

## Shared code

- Reuse `components/ui/*` (canonical), `components/layout/*`, `components/shared/*`,
  `services/api/*`, `services/mock/*`, `hooks/*`, `types/*`, `utils/*`, `constants/*`.
- If you need a new shared component, extend the canonical one in `components/ui/` —
  do not create a second copy here.

## OpenCode safety

When opencode works in this workspace, it may edit files under
`src/features/fraud-tampering/**` only. It must not touch other feature workspaces,
`src/app/router/AppRoutes.tsx` without a specific request, or shared infrastructure
unless asked.