# Workspace: explorer-simulation

## Ownership

- Owner branch: `frontend/explorer-simulation`
- Scope: Blockchain explorer + network/attack simulation views.

## Purpose

This workspace holds the public blockchain explorer (blocks, block detail,
transactions, transaction detail, overview) plus the independent local simulation
environment for exploring network behavior. The folder is a merge of the former
`explorer/**` feature.

## Primary routes

- `/explorer`
- `/explorer/blocks`
- `/explorer/blocks/:blockHash`
- `/explorer/transactions`
- `/explorer/transactions/:txId`

## What is allowed here

- Explorer overview, blocks, transactions, and detail pages.
- The `ExplorerLayout` component (feature-local shell).
- Simulation components that visualize network behavior.

## What is NOT allowed here

- Public website, verification, holder/admin, institution/employer pages.
- Security-console or fraud-analytics dashboards (see the other workspaces).
- Direct `fetch()` calls — use `services/api/*`; `blockchainService` is the boundary.
- Real blockchain logic or mining inside the frontend — consume the SecureX API/mock.

## Shared code

- Reuse `components/ui/*` (canonical), `components/layout/*`, `components/shared/*`,
  `services/api/*`, `services/mock/*`, `hooks/*`, `types/*`, `utils/*`, `constants/*`.
- If you need a new shared component, extend the canonical one in `components/ui/` —
  do not create a second copy here.

## OpenCode safety

When opencode works in this workspace, it may edit files under
`src/features/explorer-simulation/**` only. It must not touch other feature
workspaces, `src/app/router/AppRoutes.tsx` without a specific request, or shared
infrastructure unless asked.