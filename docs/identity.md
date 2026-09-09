# SecureX Global Identity Model

The SecureX Global Identity mandate makes the backend/database the single
authority for every persistent identity in the platform. Clients never invent
IDs, and every identity is unique, persistent, relational and traceable.

## Internal vs. public identity

| Kind | Shape | Where it is used | Who owns it |
| --- | --- | --- | --- |
| Internal record id | `{prefix}-{uuid v4}` (e.g. `cred-…`, `usr-…`, `hol-…`, `inst-…`, `vh-…`, `aud-…`) | Database primary keys, FKs, admin/API lookups | Backend at insert time (`server/utils/ids.ts#entityId`) |
| Public SecureX credential id | `SX-XXXX-XXXX-XXXX` (`credentials.credential_id`) | QR codes, verification URLs (`/verifications/:id`), wallet shares, ledger/`transactions.credential_id` | Backend at issue time (`newPublicCredentialId`) |
| Ledger transaction id | `0x…` (`transactions.id`) | Blockchain explorer, proof of issuance/revocation | Backend at write time (`newTxRef`) |
| Session token id | `sess-…` (`sessions.jti`, JWT `jti`) | Signed tokens only; never a public identity | Backend (`newJti`) |

Consequences:

- The **public** SecureX identity of a credential is its `credential_id`
  (`SX-…`) — this is what wallets, verifiers and the QR/URL flow share. It is
  unique database-wide (`UNIQUE` constraint) and never regenerated for a row.
- The **internal** `credentials.id` is platform-local. REST responses expose
  it (e.g. `POST /credentials` returns both `id` and `credentialId`), but
  clients must treat it as opaque and must never generate it.
- One credential row has one row in `verification_history`, `risk_assessments`
  and `transactions` per event. That link is a real foreign key
  (`credential_row_id → credentials(id)`); the public `credential_id` text is
  kept alongside so API field names match the wire contract.

## Holders and identity unification

`holders` is the single holder identity table. A credential's `holder_id` is an
FK to it. When a holder also has a platform account, the holder id **is** the
platform user id (identity is one record, not a copy).

Resolution order in `server/routes/credentials.ts#resolveHolderId`:

1. an explicit `holderId` that resolves to an existing `holders` row wins;
2. otherwise the holder is looked up case-insensitively by `holderEmail`;
3. if a platform user owns that email, holder id = user id (a `holders` row is
   created for that id if it does not already exist);
4. otherwise a fresh holder row is created with a backend-generated id.

The client **must** send `holderEmail`; `holderId` is optional and only an
existing backend id is ever honored. A fabricated or unknown `holderId` is
ignored, never stored, and never invented.

### API contract

```jsonc
// POST /credentials (any writer role)
{
  "type": "Degree",
  "title": "…",
  "description": "…",
  "holderName": "…",
  "holderEmail": "person@example.com",   // required; backend resolves identity
  "holderId": "…",                      // optional; ignored unless it exists
  "issuerId": "iss-stanford-online",
  "issuerName": "Stanford Online Learning",
  "institutionId": "inst-stanford",
  "institutionName": "Stanford University"
}

// 201 response
{
  "success": true,
  "data": {
    "id": "cred-<uuid>",          // internal, backend-generated
    "credentialId": "SX-XXXX-XXXX-XXXX", // public SecureX identity
    "holderId": "usr-holder-001", // the backend-resolved holder identity
    "status": "VALID",
    // …
  }
}

// Public verification (no auth)
GET /api/verifications/:credentialId   // canonical path form
GET /api/verifications?credentialId=…  // query form (legacy)
```

## Concurrency, collisions and constraints

- Runtime ids are UUID v4 based (`prefix-` + UUID) so rapid successive issues
  cannot collide; primary keys enforce uniqueness at the database level
  regardless.
- The database rejects collisions (`23505` → `409 DUPLICATE_IDENTITY`), dangling
  references (`23503` → `409 INVALID_REFERENCE`), missing required fields
  (`23502` → `400 REQUIRED_FIELD`), and invalid values (`23514`/`22P02`). See
  the `/api` error middleware in `server/app.ts`.
- Issuance, registration and revocation run inside a single `transaction()`:
  the credential row, its ledger `transactions` row and the audit event commit
  or roll back together.

## Seeding and migration

- `server/db/seed.ts` keeps canonical demo/SIH identities (`cred-001…015`,
  `usr-*`, `inst-*`, `SX-…`) byte-for-byte, inserting in FK dependency order
  (institutions → holders → users → issuers → credentials → …). Seeding runs
  only on a fresh database (`schema_meta.seeded` guard) and never overwrites
  existing rows.
- `server/scripts/import-sqlite.ts` lifts legacy SQLite data: institutions,
  users and issuers first, then derives `holders` from the distinct
  `holder_id`/`holder_name` pairs already present on the migrated credentials
  (so no holder identity is invented), then back-fills `credential_row_id` on
  `verifications`/`risk_assessments`/`transactions` from the migrated public
  `credential_id` values.

## Consumers (Flutter / mobile wallet)

Internal DB ids must never reach on-chain crypto or wallet shares. The mobile
wallet and any external consumer should:

1. Carry the **public** `SX-…` credential id in QR payloads and verification
   URLs — never `credentials.id` or `holder_id`.
2. Treat email as the holder resolution key: pass `holderEmail` when requesting
   issuance; never generate a local uuid and send it as `holderId`.
3. After issue, read `credentialId` (+ `id` and `holderId`) from the response
   and store them as opaque strings for later display/verification.
4. Verify via `GET /verifications/:credentialId` (public, no auth) and compare
   the returned `data.credential.id` / `data.status` against local state.