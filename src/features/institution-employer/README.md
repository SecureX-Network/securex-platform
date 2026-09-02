# Workspace: institution-employer

## Ownership

- Owner branch: `frontend/institution-employer`
- Scope: Institution panel + Employer panel.

## Purpose

This workspace covers both sides of the verification economy: institutions that
issue and manage credentials, and employers that verify them.

## Primary routes

- Institution: `/institution/*` (dashboard, credentials, issuers, issuer detail, issue, templates)
- Employer: `/employer/*` (dashboard, verify, history)

## What is allowed here

- Institution dashboard, credential issuing, issuer management, and template pages.
- Employer dashboard, credential verification, and verification history pages.
- Page-local `__tests__/` alongside the page.

## What is NOT allowed here

- Holder wallet or admin console UI.
- Public website or verification (public) pages.
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
`src/features/institution-employer/**` only. It must not touch other feature
workspaces, `src/app/router/AppRoutes.tsx` without a specific request, or shared
infrastructure unless asked.