# Workspace: holder-admin

## Ownership

- Owner branch: `frontend/holder-admin`
- Scope: Holder wallet + Admin console + canonical shared UI.

## Purpose

This workspace holds the personal credential wallet (holder) together with the
platform admin console (super admin dashboard, security overview, audit). The
bundle-source file merges the former `holder/**` and `admin/**` feature folders.

## Primary routes

- Holder: `/holder/*` (dashboard, credentials, credential detail, share, notifications, settings)
- Admin: `/admin/*` (dashboard, institutions, issuers, users, security, security alerts, audit, settings)

## What is allowed here

- Holder wallet pages and their components.
- Admin console pages (SDK-less admin-only backend ops are out of scope; UI only).
- Page-local `__tests__/` alongside the page.

## What is NOT allowed here

- Public website, verification, institution/employer dashboards.
- Explorer, security-center, or fraud UI.
- Direct `fetch()` calls — use `services/api/*`.
- Duplicates of shared components — reuse `components/ui/*`.

## Shared code

- Reuse `components/ui/*` (canonical), `components/layout/*`, `components/shared/*`,
  `services/api/*`, `services/mock/*`, `hooks/*`, `types/*`, `utils/*`, `constants/*`.
- If you need a new shared component, extend the canonical one in `components/ui/` —
  do not create a second copy here.

## OpenCode safety

When opencode works in this workspace, it may edit files under
`src/features/holder-admin/**` only. It must not touch other feature workspaces,
`src/app/router/AppRoutes.tsx` without a specific request, or shared infrastructure
unless asked.