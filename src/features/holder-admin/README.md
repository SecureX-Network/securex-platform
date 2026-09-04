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

## Real backend integration (Phase 2)

- `services/holderAdminService.ts` is the single feature-local integration layer.
  It branches on `IS_MOCK` (from `VITE_USE_MOCK`): DEMO mode reuses the Phase 1
  mock services; REAL mode calls the SecureX blockchain REST API
  (`VITE_BLOCKCHAIN_API_URL`, default `http://localhost:3001`) via
  `fetchBlockchainAPI` and maps backend shapes to the shared UI types.
- Backend contract types live in `types/backend.ts` and mirror the real backend
  responses (issuer, credential, lifecycle, verify, tamper-check, QR, audit,
  state, health). Real endpoints are NOT invented here.
- Pages call the `getReal*` / `getHolder*View` functions instead of shared
  `adminService`/`credentialService` directly, so no page-level mock/real
  conditionals are needed.
- Honest constraints (verified against a live node):
  - The ledger stores public credential IDs with no holder PII. In REAL mode the
    holder wallet shows the on-chain credential set (probed from the demo chain
    IDs in `REAL_DEMO_CREDENTIAL_IDS`), not fictional per-holder "Emily" records.
  - Credential lifecycle: suspend on an ACTIVE credential commits via the
    anonymous/validator path; reinstate/revoke/reissue require issuer-level
    signing (V2) and can be rejected with `INVALID_SIGNATURE` for a browser
    caller. The service surfaces these rejections honestly (throws on
    `submitted:false`) — there is no mock/real masking.
  - Issuer suspend/restore on `AdminIssuersPage` is a UI-only affordance; the
    backend has no dedicated "suspend issuer" lifecycle endpoint, so it reflects
    on-chain state on load and does not fabricate a mutation.