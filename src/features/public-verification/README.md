# Workspace: public-verification

## Ownership

- Owner branch: `frontend/public-verification`
- Scope: Public website + Credential Verification + credential details.

## Purpose

This workspace holds the public-facing marketing/signup surface together with the
credential verification flow. Land, about, how-it-works, contact, and verification
pages all live here.

## Primary routes

- `/` (Home)
- `/about`
- `/how-it-works`
- `/contact`
- `/verify`
- `/verify/:credentialId`

## What is allowed here

- Public website pages and their components.
- Verification pages (manual ID entry + QR flow).
- Any new public or verification-related page/component.
- Page-local `__tests__/` alongside the page.

## What is NOT allowed here

- Logged-in dashboards (institution/employer/holder/admin).
- Explorer, security, or fraud UI.
- Direct `fetch()` calls — use `services/api/*`.
- Duplicates of shared components — reuse `components/ui/*`.

## Shared code

- Reuse `components/ui/*` (canonical), `components/layout/*`, `components/shared/*`,
  `services/api/*`, `services/mock/*`, `hooks/*`, `types/*`, `utils/*`, `constants/*`.
- If you need a new shared component, extend the canonical one in `components/ui/` —
  do not create a second copy here.

## OpenCode safety

When opencode works in this workspace, it may edit files under
`src/features/public-verification/**` only. It must not touch other feature
workspaces, `src/app/router/AppRoutes.tsx` without a specific request, or shared
infrastructure unless asked.