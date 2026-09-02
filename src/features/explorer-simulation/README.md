# Workspace: explorer-simulation

## Ownership

- Owner branch: `frontend/explorer-simulation`
- Scope: Blockchain explorer (real SecureX Blockchain V2 integration) plus a
  controlled attack-simulation + security-evidence environment.

## Purpose

This workspace holds the public blockchain explorer (overview, blocks, block
detail, transactions, transaction detail, validators, validator detail,
network) plus an independent local **controlled demonstration** environment for
exploring network attack behavior. The folder is a merge of the former
`explorer/**` feature.

The explorer now integrates with the **real SecureX Blockchain V2 node API**
when `VITE_USE_MOCK !== 'false'` is **false** (REAL mode). When mock mode is
enabled it falls back to demo data (DEMO mode) so the UI still runs without a
connected node.

## Primary routes

Explorer:

- `/explorer` — overview / dashboard
- `/explorer/blocks` — block list
- `/explorer/blocks/:height` — block detail
- `/explorer/transactions` — transaction list
- `/explorer/transactions/:txId` — transaction detail
- `/explorer/validators` — validator list
- `/explorer/validators/:id` — validator detail
- `/explorer/network` — network status & peers

Attack Simulation + Security Evidence (controlled demonstration):

- `/explorer/attack-simulation` — scenario picker
- `/explorer/attack-simulation/:id` — `scn-*` configures a scenario, `sim-*` shows a result
- `/explorer/security/evidence/:id` — demo evidence for a simulation (`sim-*`)

## Data source behavior

Every Explorer page resolves its data through `services/explorerService.ts`.
Mode is determined once by `getDataSourceMode()`, which reads the `IS_MOCK`
flag (from `VITE_USE_MOCK`):

- `VITE_USE_MOCK !== 'false'` (default) → **DEMO** → deterministic mock data.
- `VITE_USE_MOCK=false` → **REAL** → live SecureX Blockchain V2 node API.

A `DataSourceBadge` on each page shows whether the data is **"Live blockchain
data"** (REAL) or **"Demo data"** (DEMO), and pages show a reconciling note.

### REAL BACKEND DATA (live SecureX Blockchain V2 node)

In REAL mode the explorer reads the node REST API through `fetchBlockchainAPI`
(`src/services/api/client.ts`), which targets `VITE_BLOCKCHAIN_API_URL`
(default `http://localhost:3001`) and validates the `{ success, data, error }`
response envelope.

What is genuinely backed by the live API:

- Blocks: `GET /blocks?offset&limit`, `GET /blocks/:height`
- Block detail: `GET /blocks/:height`
- Transaction detail: `GET /transactions/:id` (record `{ transaction, blockHeight }`)
- Validators: `GET /state/validators` (id, public key, ACTIVE/INACTIVE, addedAt)
- Network status: `GET /network/status`
- Peers: `GET /network/peers`
- Health: `GET /health`
- Node metrics (best-effort): `GET /metrics`

The Blockchain V2 protocol is **Permissioned Proof of Authority** (single
active proposer, `minSignatures = 1`), Ed25519 signatures, nonce replay
protection, and only SHA-256 hashes/Merkle roots on-chain. The explorer shows
only honest, real fields — no invented gas/mining/staking/currency telemetry.

### DEMO / CONTROLLED SIMULATION DATA

When mock mode is enabled the explorer renders deterministic feature-local
demo data (`data/validators.ts`, `data/network.ts` and the shared mock service
via `blockchainService`). Demo data is clearly labeled with the "Demo"
`DataSourceBadge`. No demo value is presented as confirmed live chain state.

## Environment configuration

See `.env.example` at the repo root:

- `VITE_API_BASE_URL` — shared REST API base (default `http://localhost:4000/api`).
- `VITE_BLOCKCHAIN_API_URL` — SecureX Blockchain V2 node base (default `http://localhost:3001`).
- `VITE_USE_MOCK` — `false` selects REAL node data; otherwise the app runs in DEMO mode.

No secrets, tokens, private keys, or credentials belong in `.env.example` or in
this feature.

## Current Blockchain V2 integration status

The frontend calls only endpoints that actually exist on the backend. Where the
backend has no endpoint, the feature keeps an explicitly-labeled demo/mock
behavior rather than fabricating a contract. Specifically:

- **Transactions list** — `Not available in current Blockchain V2 API` (there is
  only `GET /transactions/:id` and `POST /transactions`). The transactions browse
  page compiles its list from recent REAL block data (`GET /blocks`), which is
  honest: every transaction genuinely comes from a block.
- **Attack simulation / security evidence** — **No live attack endpoint exists**
  in the current Blockchain V2 API, so attack simulation **remains a controlled
  local demonstration**. It does not execute against the live node and never
  claims to.
- **Network/validator rich telemetry** (tps, average block time, per-validator
  name/role/height/blocks proposed, node version per validator) — not exposed by
  the backend; these are intentionally absent or demo-only, never live.

## Validator integration (REAL)

`getExplorerValidators()` maps `GET /state/validators` records
(`validatorId`, `publicKey`, `status`, `addedAt`) to the limited honest view the
validator list and detail pages render (`id`, `publicKey`, `active`/`inactive`,
`addedAt`). Validator detail intentionally shows **only** real fields and notes
this instead of inventing telemetry.

## Network integration (REAL)

`getExplorerNetworkStatus()` maps `GET /network/status` (and best-effort
`GET /metrics`), and `getExplorerPeers()` maps `GET /network/peers`. The network
page shows only fields actually available (height, validator count, peer count,
pending transactions, current proposer, protocol/node version, node id, status,
and connected/known peers). It does **not** display fabricated tps or average
block time.

## Block integration (REAL)

`getExplorerBlocks()` maps `GET /blocks?offset&limit` (an honest raw array with
**no** `total`), so the list reports `total = offset + rowsReturned` and derives
`hasMore` from a full page. `getExplorerBlockByHeight()` maps `GET /blocks/:height`
and renders the block's own transactions, fixing the previous page-1-only bug.

## Transaction integration (REAL)

`getExplorerTransactionById()` maps `GET /transactions/:id` to the block-height
record. `getRecentTransactions()` aggregates from recent real blocks (see the
list caveat above). Transaction detail shows real fields only: id, type,
protocol/transaction version, sender, nonce, timestamp, block height.

## Attack simulation + security evidence status

Attack Simulation stays a **controlled demo** because the current Blockchain V2
API does not expose an attack-simulation endpoint — **we do not claim live
attack execution**. Six scenarios (`scn-01`…`scn-06`) run deterministically
locally. Security Evidence and Merkle Proof viewer render **demo** hashes,
signature results, Merkle paths, block-integrity checks and security events,
clearly labeled as demo. The Merkle viewer explains that SecureX anchors only
SHA-256 Merkle roots on-chain (no fake crypto claims).

## Feature-local components

- `components/ExplorerLayout.tsx` — feature shell (header, tabs, secondary Security nav, footer).
- `components/InfoRow.tsx` — key/value detail row used by block/transaction detail.
- `components/HashDisplay.tsx` — truncated hash with a copy-to-clipboard action.
- `components/DataSourceBadge.tsx` — REAL ("Live blockchain data") vs DEMO ("Demo data") indicator.
- `components/AttackScenarioCard.tsx` — attack type, severity, expected-defense card.
- `components/EvidenceStatus.tsx` — status badge for evidence/hash/signature states.
- `components/SeverityBadge.tsx` — LOW/MEDIUM/HIGH/CRITICAL badge.
- `components/MerkleProofViewer.tsx` — leaf/sibling/root demo proof path with status.
- `components/EvidenceCard.tsx` — evidence line list with optional block link.
- `components/SecurityEventTimeline.tsx` — evidence + security event timelines.
- `components/SimulationProgress.tsx` — feature-local 7-stage progress stepper.

## Feature-local data

- `data/validators.ts` — deterministic validator mock data and proposer metadata (DEMO).
- `data/network.ts` — deterministic network/consensus/peer mock data (DEMO).
- `data/attackScenarios.ts` — six attack scenarios (`scn-01`…`scn-06`).
- `data/securityEvents.ts` — six mock security events (`evt-sec-1001`…`1006`).
- `data/attackResults.ts` — seeded simulation results (`sim-0009`…`sim-0014`).
- `data/evidence.ts` — deterministic DEMO evidence builders (non-cryptographic
  `demoHash`, honest labels; session evidence map).

## Feature-local services

- `services/explorerService.ts` — REAL/DEMO switch, view models, API mappers,
  timeout + retry (`runWithRetry`), and all explorer data access.
- `services/attackSimulationService.ts` — async local DEMO data access plus
  `runSimulation()` which produces new `sim-0015+` results/evidence
  deterministically (no HTTP, no real crypto).

## Integration tests

- `__tests__/explorerService.integration.test.ts` — exercises the REAL-mode
  API mapping against a stubbed global `fetch` (never a live backend): block
  list/detail, transaction detail and aggregation, validators, network status
  (with metrics fallback), peers, health, pagination metadata, 404 handling,
  network-unreachable (status 0), malformed responses, retry, and REAL vs DEMO
  mode detection.

## Attack simulation usage (DEMO)

1. Open `/explorer/attack-simulation`, pick one of the six scenarios.
2. Review the attack + expected-defense cards and configure the run.
3. Click **Run simulation** to watch the 7-stage progress (preparing → defense →
   detected/rejected → result).
4. Open `/explorer/security/evidence/:id` to review demo hashes, signature result,
   Merkle path, block integrity, and the related security event.

Everything here is a **controlled local demonstration** — deterministic mock
data, clearly labeled ("Demo", "Controlled demonstration"), no private keys, no
claim of live execution.

## What is allowed here

- Explorer overview, blocks, transactions, validators, network, and detail pages.
- Real SecureX Blockchain V2 API integration via `services/api/client.ts`
  (`fetchBlockchainAPI`) and the `explorerService` view-model mapper.
- The `ExplorerLayout` component (feature-local shell).
- Simulation components that visualize network behavior.
- Attack simulation + security evidence: rendering scenarios, running local
  simulations, and displaying demo hash/signature/Merkle/event evidence.

## What is NOT allowed here

- Inventing backend endpoints. Every frontend API call must match the actual
  Blockchain V2 implementation.
- Claiming live attack execution or fabricated live telemetry.
- Public website, verification, holder/admin, institution/employer pages.
- Security-console or fraud-analytics dashboards (see the other workspaces).
- Direct `fetch()` calls — use `services/api/*`; `client.ts` is the boundary.
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