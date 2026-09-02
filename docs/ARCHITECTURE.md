# SecureX Platform Architecture

This document describes the high-level architecture of the SecureX Platform frontend. It is intended for the frontend engineers who will maintain and extend this codebase, each owning one feature workspace.

## Design Principles

1. **One platform, many experiences.** SecureX is a single React SPA. Public website, verification, institution panel, holder wallet, employer panel, admin panel, and blockchain explorer are all **routes inside the same application**, not separate projects.
2. **Feature-oriented structure.** Code is grouped by domain so work is easy to find and ownership is clear.
3. **API abstraction.** UI components never call `fetch()` directly. All data access flows through `services/api/*`, which can transparently switch between mock data and the real SecureX backend.
4. **Foundation first.** This is a V1 foundation. Prefer simple, clear code over elaborate abstractions. Do not overbuild.
5. **Serious infrastructure, not crypto.** SecureX trusts credentials. Avoid flashy crypto aesthetics; keep the design professional and trustworthy.

## Directory Overview

```
src/
├── app/                # Application shell (router, providers, config)
├── components/
│   ├── ui/             # Reusable UI primitives (Button, Modal, Table, ...)
│   ├── layout/         # Layouts (Public, Dashboard, Holder) + Navbar/Sidebar/Topbar
│   └── shared/         # PageLoader, NotFound, Unauthorized
├── features/           # Feature workspaces, one per frontend branch + shared auth
│   ├── auth/                   # SHARED application infrastructure
│   ├── public-verification/    # frontend/public-verification
│   ├── institution-employer/   # frontend/institution-employer
│   ├── holder-admin/           # frontend/holder-admin
│   ├── security-center/        # frontend/security-center (reserved)
│   ├── fraud-tampering/        # frontend/fraud-tampering (reserved)
│   └── explorer-simulation/    # frontend/explorer-simulation
├── hooks/              # Shared custom hooks (useApi, useAuth, useDebounce)
├── services/
│   ├── api/            # Service boundary modules (credential, verification, admin, ...)
│   └── mock/           # Mock data + mock-only helpers (CLEARLY ISOLATED)
├── types/              # Shared TypeScript models
├── utils/              # Pure helper functions
├── constants/          # Routes, navigation, status maps
├── styles/             # Tailwind global styles / design tokens
```

## Frontend Engineer Ownership

To avoid merge conflicts and stepping on each other's work, the codebase is split into
feature workspaces aligned with the branch strategy. **Each frontend branch maps to exactly
one feature workspace**:

- `frontend/public-verification` → `src/features/public-verification/**`
- `frontend/institution-employer` → `src/features/institution-employer/**`
- `frontend/holder-admin` → `src/features/holder-admin/**`
- `frontend/security-center` → `src/features/security-center/**`
- `frontend/fraud-tampering` → `src/features/fraud-tampering/**`
- `frontend/explorer-simulation` → `src/features/explorer-simulation/**`

### Shared infrastructure (outside all workspaces)

Work spanning more than one workstream stays shared and is NOT moved into any workspace:

- `src/features/auth/**` — shared application infrastructure (authentication flows).
- `src/components/**` — shared UI / layout infrastructure; `src/components/ui/**` is the
  canonical, single source-of-truth component library.
- `src/services/**` — the shared API / mock integration boundary.
- `src/hooks/**`, `src/types/**`, `src/utils/**`, `src/constants/**`, `src/config/**`,
  `src/styles/**` — shared infrastructure.
- `src/app/router/AppRoutes.tsx` — the application composition / root routing layer that
  lazy-loads every workspace page; it is the only file that imports across all workspaces.

Each feature workspace contains a `README.md` declaring its owner branch, purpose, primary
routes, allowed scope, shared-code reuse, and OpenCode safety guidance.

> **Important:** There is a single canonical implementation of each shared component in `src/components/ui/`. If you need a new variant, **extend the existing component** — do not create a second, inconsistent copy in your feature folder. This avoids drift and merge conflicts.

## Data Flow

UI component → `features/<x>/pages/*` → `services/api/<service>.ts` → (mock data OR real HTTP API)

Each page follows this pattern:
1. Call a service function (e.g. `verificationService.verifyCredential(id)`).
2. Handle **loading**, **error**, and **empty** states.
3. Render data via shared UI components.

## API Service Layer

Every domain has a logical service boundary in `src/services/api/`:

- `authService` — login, register, MFA, profile
- `credentialService` — issue, query, revoke credentials
- `verificationService` — verify a credential, verification history
- `institutionService` — institutions, issuers, audits
- `adminService` — admin stats, alerts, audit events, users
- `blockchainService` — blocks, transactions, network stats

Each service checks the `IS_MOCK` flag. When `VITE_IS_MOCK=true`, the service returns data from `src/services/mock/data.ts`. When the real backend is ready, switch `VITE_IS_MOCK=false` and implement the fetch branches — **the UI does not change**.

## Mock Data

Mock data lives exclusively in `src/services/mock/`. It is clearly separated and **never described as live data**. Pages label demo values (e.g. "demo data") so users are never misled.

To connect the real backend:
1. Set `VITE_IS_MOCK=false`.
2. Implement the non-mock branch in each `services/api/*` function.
3. Do not touch page components unless backend shapes differ from the shared types.

## Authentication & Roles

- `AuthProvider` (`app/providers/AuthProvider.tsx`) holds session state (mock-only in V1; session stored in `localStorage`).
- `ProtectedRoute` (`app/router/ProtectedRoute.tsx`) gates routes by role.
- Roles: `PUBLIC`, `HOLDER`, `INSTITUTION`, `ISSUER`, `EMPLOYER`, `ADMIN`, `SECURITY_ADMIN`, `NETWORK_ADMIN`, `AUDITOR`.

**Security note:** Frontend role checks are a UX layer and route-protection convenience only. The backend **must** enforce all permissions. Never store secrets, API keys, or private keys in frontend code.

## Blockchain & Fraud Engine

The frontend integrates with the existing `securex-blockchain` and fraud-engine services **through APIs/interfaces only**. Do not implement fake blockchain logic or mining inside the frontend. Do not modify `securex-blockchain` from this repository.

## Adding a New Feature

1. Create `src/features/<name>/pages/<PageName>Page.tsx` (default export).
2. Add the route to `app/router/AppRoutes.tsx` (lazy-loaded).
3. Add any navigation item to the relevant layout.
4. If you need data, add a service function to the appropriate `services/api/*` (with a mock branch).
5. Add shared component(s) only to `src/components/ui/` if truly reusable.
6. Write a component test; run `npm run lint`, `npm run typecheck`.

## Verifying Your Work

```bash
npm run dev          # start dev server
npm run test         # run tests
npm run lint         # ESLint (0 errors expected)
npm run typecheck    # TypeScript strict checks
npm run build        # production build
```
