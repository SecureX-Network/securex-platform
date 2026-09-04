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

## Running the real verification flow (local)

The verification page defaults to demo/mock mode (`VITE_USE_MOCK` not set to
`false`). To run against the real SecureX blockchain backend:

1. **Start the backend** (`securex-blockchain` repodir, e.g. `~/ctn-blockchain`):

   ```bash
   npm run dev        # (or the project's dev script) serves on http://localhost:3001
   ```

2. **Seed/load the demo credentials** (required — the seeded credential IDs are
   the source of truth the sample IDs are drawn from):

   ```bash
   npm run seed       # e.g. scripts/demo-data.ts; see ctn-blockchain README
   ```

3. **Start the frontend** and point it at the real backend. In `.env` (copy from
   `.env.example`):

   ```bash
   VITE_USE_MOCK=false
   VITE_BLOCKCHAIN_API_URL=http://localhost:3001
   ```

   ```bash
   npm run dev
   ```

4. **Verify.** Open `http://localhost:3000/verify`, pick a sample PUBLIC credential
   ID (`SX-XXXX-XXXX-XXXX`, e.g. `SX-2F9C-A41B-8D7E`), enter it, or scan a SecureX
   QR code. The result is fetched live from the backend via `GET /verify/:id`
   (and `POST /verify` when a document hash is supplied). A scanned opaque SecureX
   payload is forwarded to `POST /verify/qr`, which authenticates it and returns
   the public-safe verification result.

Notes:

- **Public vs internal IDs.** A credential has two identifiers: the PUBLIC
  verification ID (`SX-2F9C-A41B-8D7E`) shown on credentials and entered on this
  page, and the INTERNAL credential ID (`sxu-btech-2026-0001`) used by
  ledger/issuer/holder tooling. The public surface never displays an internal ID,
  and the SecureX QR image never displays the public ID (it carries an opaque
  authenticated token instead).
- The backend resolves a public ID through its public → internal mapping and
  scrubs the internal ID from every public verification response.
- **Case.** Public IDs (`SX-...`) are case-insensitive on input — the frontend
  uppercases them before verification. Internal-style IDs are only trimmed and
  never altered.
- **QR scanning.** `VerifyPage` includes a browser QR scanner (jsQR). It accepts
  only SecureX protocol payloads (`SXQR1.<opaqueToken>.<issuedAt>.v1.<signature>`)
  and never navigates to an arbitrary URL inside a QR. The QR payload is OPAQUE —
  it contains no readable public/internal credential ID, URL, or PII. The scanner
  forwards the opaque payload to the backend (`POST /verify/qr`, the trust
  boundary), which authenticates its signature, enforces expiry, and resolves it
  to the credential. In demo/mock mode a fixed demo token mapping is used instead
  of the live backend.
- Public verification is unauthenticated; `VITE_BLOCKCHAIN_AUTH_TOKEN` is only
  needed for privileged writes (issuer/credential lifecycle), not for verifying.
- Demo mode requires no backend and no env changes — it uses mock data.

## OpenCode safety

When opencode works in this workspace, it may edit files under
`src/features/public-verification/**` only. It must not touch other feature
workspaces, `src/app/router/AppRoutes.tsx` without a specific request, or shared
infrastructure unless asked.