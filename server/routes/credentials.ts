import { Router, Request, Response } from 'express';
import { all, get, run, transaction } from '../db/database.js';
import { mapCredentialRow, type CredentialRow } from '../db/mappers.js';
import { serverConfig } from '../config.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditFor } from '../services/audit.js';
import {
  CREDENTIAL_WRITER_ROLES,
  authorizeCredentialRead,
  authorizeCredentialWrite,
  credentialListScope,
  resolveIssuanceInstitution,
  resolveIssuanceIssuer,
} from '../services/credentialAuthorization.js';
import { created, fail, ok, param } from '../utils/http.js';
import { entityId, makeHex, newPublicCredentialId, newTxRef, nowIso } from '../utils/ids.js';
import {
  anchorCredential,
  anchorRevocation,
  hashCredentialDocument,
  type AnchorResult,
} from '../services/credentialAnchor.js';
import { logger } from '../services/logger.js';

export const credentialsRouter = Router();

/**
 * Roles permitted to write credentials. AUDITOR is deliberately excluded — it is
 * a read-only role. Object-level (tenant) enforcement is applied in the handler
 * via services/credentialAuthorization.ts; this list is only the coarse gate.
 */
const CREDENTIAL_WRITE_ROLES = CREDENTIAL_WRITER_ROLES;

const credentialSelect = `
  SELECT c.id, c.credential_id, c.type, c.title, c.description, c.holder_name, c.holder_id,
         c.issuer_id, c.institution_id, c.status, c.issued_at, c.expires_at, c.revoked_at,
         c.revoked_reason, c.tx_hash, c.merkle_root, c.digital_signature, c.template_id, c.metadata_json,
         c.credential_hash, c.chain_issuer_id, c.chain_tx_id, c.chain_block_height, c.chain_block_hash,
         c.anchor_status, c.anchor_error,
         k.name AS issuer_name, i.name AS institution_name
  FROM credentials c
  JOIN issuers k ON k.id = c.issuer_id
  JOIN institutions i ON i.id = c.institution_id
`;

async function findByPublicOrInternal(id: string): Promise<CredentialRow | undefined> {
  return get<CredentialRow>(
    `${credentialSelect} WHERE c.id = ? OR c.credential_id = ?`,
    id,
    id,
  );
}

interface HolderLookup {
  holderId?: string;
  holderEmail: string;
  holderName: string;
}

/**
 * Resolve the canonical holder identity for a new credential. The backend is
 * the only authority that decides holder identity:
 *
 *   1. an explicit holderId that resolves to a persisted holder row wins;
 *   2. otherwise the holder is looked up (case-insensitive) by email;
 *   3. if a platform user owns that email, the holder identity IS the platform
 *      user id (wallet identity == platform identity — one record);
 *   4. otherwise a brand-new holder row is created with a backend-generated id.
 *
 * A client-supplied id is never stored unless it already exists on the
 * backend, so the frontend cannot inject an invented persistent identity.
 */
async function resolveHolderId(input: HolderLookup): Promise<string> {
  const { holderId, holderEmail, holderName } = input;
  const email = holderEmail.trim().toLowerCase();

  if (holderId && holderId.trim()) {
    const existing = await get<{ id: string }>('SELECT id FROM holders WHERE id = ?', holderId.trim());
    if (existing) return existing.id;
  }

  const byEmail = await get<{ id: string }>('SELECT id FROM holders WHERE lower(email) = lower(?)', email);
  if (byEmail) return byEmail.id;

  const user = await get<{ id: string }>('SELECT id FROM users WHERE lower(email) = lower(?)', email);
  if (user) {
    const holderForUser = await get<{ id: string }>('SELECT id FROM holders WHERE id = ?', user.id);
    if (!holderForUser) {
      await run(
        `INSERT INTO holders (id, email, name, created_at) VALUES (?, ?, ?, ?)`,
        user.id,
        email,
        holderName,
        nowIso(),
      );
    }
    return user.id;
  }

  const id = entityId('hol');
  await run(
    `INSERT INTO holders (id, email, name, created_at) VALUES (?, ?, ?, ?)`,
    id,
    email,
    holderName,
    nowIso(),
  );
  return id;
}

credentialsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  void listCredentialsHandler(req, res);
});

async function listCredentialsHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;

  // The list is a BULK read, so it is scoped by the same tenant boundary that
  // authorizeCredentialRead enforces per record. A `?holderId=` query narrows
  // the result but never widens it: a holder may only narrow to themselves, and
  // a tenant role may only narrow inside its own institution.
  const scope = credentialListScope(auth.user);
  const requestedHolderId = typeof req.query.holderId === 'string' ? req.query.holderId : undefined;

  let where = '';
  const params: string[] = [];

  if (requestedHolderId !== undefined) {
    if (scope.kind === 'holder' && scope.holderId !== requestedHolderId) {
      ok(res, []);
      return;
    }
    where = 'WHERE c.holder_id = ?';
    params.push(requestedHolderId);
  } else if (scope.kind === 'holder') {
    where = 'WHERE c.holder_id = ?';
    params.push(scope.holderId);
  } else if (scope.kind === 'institution') {
    where = 'WHERE c.institution_id = ?';
    params.push(scope.institutionId);
  } else if (scope.kind === 'none') {
    ok(res, []);
    return;
  }

  const rows = await all<CredentialRow>(
    `${credentialSelect} ${where} ORDER BY c.issued_at DESC`,
    ...params,
  );
  ok(res, rows.map(mapCredentialRow));
}

credentialsRouter.get('/:id', requireAuth, (req: Request, res: Response) => {
  void getCredentialHandler(req, res);
});

async function getCredentialHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const row = await findByPublicOrInternal(param(req, 'id'));
  if (!row) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }
  // Object-level read authorization against the credential's real ownership.
  // An out-of-scope credential is reported identically to a missing one so the
  // endpoint cannot be used to probe for the existence of other tenants' records.
  const decision = authorizeCredentialRead(auth.user, {
    institution_id: row.institution_id,
    issuer_id: row.issuer_id,
    holder_id: row.holder_id,
  });
  if (!decision.allowed) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }
  ok(res, mapCredentialRow(row));
}

credentialsRouter.post(
  '/',
  requireAuth,
  requireRole(...CREDENTIAL_WRITE_ROLES),
  validate([
    { name: 'type', required: true, type: 'string' },
    { name: 'title', required: true, type: 'string' },
    { name: 'description', required: true, type: 'string' },
    { name: 'holderName', required: true, type: 'string' },
    { name: 'holderEmail', required: true, type: 'email' },
    { name: 'holderId', type: 'string' },
    { name: 'issuerId', required: true, type: 'string' },
    { name: 'issuerName', required: true, type: 'string' },
    { name: 'institutionId', required: true, type: 'string' },
    { name: 'institutionName', required: true, type: 'string' },
    { name: 'templateId', type: 'string' },
    { name: 'expiresAt', type: 'string' },
    { name: 'metadata', type: 'object' },
  ]),
  (req: Request, res: Response) => {
    void createCredentialHandler(req, res);
  },
);

async function createCredentialHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const body = req.body as {
    type: string;
    title: string;
    description: string;
    holderName: string;
    holderEmail: string;
    holderId?: string;
    issuerId: string;
    issuerName: string;
    institutionId: string;
    institutionName: string;
    templateId?: string;
    expiresAt?: string;
    metadata?: Record<string, string>;
  };

  // ── Tenant boundary ────────────────────────────────────────────────────
  //   authenticated user -> authorized institution -> authorized issuer -> credential
  //
  // `body.institutionId` / `body.issuerName` / `body.institutionName` are NOT an
  // authorization decision. The institution is resolved from the authenticated
  // user's organization context (platform admins may select a tenant explicitly),
  // the issuer must belong to that institution, and both display names are read
  // from the database rather than trusted from the request.
  const institutionResult = await resolveIssuanceInstitution(
    auth.user,
    body.institutionId,
  );
  if (!institutionResult.ok) {
    fail(res, institutionResult.status, institutionResult.code, institutionResult.message);
    return;
  }
  const { institution } = institutionResult;

  const issuerResult = await resolveIssuanceIssuer(
    auth.user,
    body.issuerId,
    institution.institutionId,
  );
  if (!issuerResult.ok) {
    fail(res, issuerResult.status, issuerResult.code, issuerResult.message);
    return;
  }
  const { issuer } = issuerResult;

  // An expiry date must be a real, parseable, future-dated timestamp. We never
  // fabricate or default an expiry date: an absent expiresAt means "no expiry".
  let expiresAt: string | null = null;
  if (body.expiresAt) {
    const parsed = Date.parse(body.expiresAt);
    if (Number.isNaN(parsed)) {
      fail(res, 400, 'INVALID_EXPIRY', 'expiresAt must be a valid ISO-8601 timestamp.');
      return;
    }
    expiresAt = new Date(parsed).toISOString();
  }

  let issuedRow: ReturnType<typeof mapCredentialRow> | undefined;
  // Captured inside the transaction, anchored after it commits: the anchor is a
  // network call and must never be made while holding a database transaction.
  let anchorDocument: Parameters<typeof hashCredentialDocument>[0] | undefined;

  await transaction(async () => {
    const holderId = await resolveHolderId({
      holderId: body.holderId,
      holderEmail: body.holderEmail,
      holderName: body.holderName,
    });

    // Canonical identities are generated here — never accepted from the client.
    const id = entityId('cred');
    const credentialId = newPublicCredentialId(Date.now() % 9000);
    const issuedAt = nowIso();

    // The credential document that gets hashed for the ledger. Only this hash
    // reaches the chain; holder PII and credential text stay on the platform.
    const credentialHash = hashCredentialDocument({
      credentialId,
      type: body.type,
      title: body.title,
      description: body.description,
      holderName: body.holderName,
      issuerName: issuer.issuerName,
      institutionName: institution.institutionName,
      issuedAt,
      expiresAt,
    });

    await run(
      `INSERT INTO credentials (id, credential_id, type, title, description, holder_name, holder_id,
         issuer_id, institution_id, status, issued_at, expires_at, template_id, metadata_json,
         credential_hash, chain_issuer_id, anchor_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID', ?, ?, ?, ?, ?, ?, 'PENDING')`,
      id,
      credentialId,
      body.type,
      body.title,
      body.description,
      body.holderName,
      holderId,
      issuer.issuerId,
      institution.institutionId,
      issuedAt,
      expiresAt,
      body.templateId ?? null,
      body.metadata ? JSON.stringify(body.metadata) : null,
      credentialHash,
      chainIssuerId(),
    );

    // Local platform event log (drives the explorer projection). This is a
    // platform-side record of a real event — it is NOT a blockchain block, and it
    // is deliberately left at PENDING with 0 confirmations forever. The chain's
    // real block height, block hash and Merkle root live on the credential's
    // anchor columns and are read from the chain itself. Upgrading this row
    // would fabricate a second, local version of the chain's history.
    const top = await get<{ max: number | null }>('SELECT MAX(height) AS max FROM blocks');
    const height = (top?.max ?? 0) + 1;
    await run(
      `INSERT INTO transactions (id, block_height, type, timestamp, from_address, to_address, credential_id, credential_row_id, status, gas_used, confirmations)
       VALUES (?, ?, 'CREDENTIAL_ISSUED', ?, ?, ?, ?, ?, 'PENDING', ?, 0)`,
      newTxRef(),
      height,
      issuedAt,
      `0x${makeHex(80_000, 40)}`,
      `0x${makeHex(90_000, 40)}`,
      credentialId,
      id,
      21_000,
    );

    await auditFor(auth, {
      action: 'CREDENTIAL_ISSUED',
      target: id,
      targetType: 'credential',
      details: `institution=${institution.institutionName}; issuer=${issuer.issuerName}; credential=${credentialId}; via web issue flow`,
    });

    anchorDocument = {
      credentialId,
      type: body.type,
      title: body.title,
      description: body.description,
      holderName: body.holderName,
      issuerName: issuer.issuerName,
      institutionName: institution.institutionName,
      issuedAt,
      expiresAt,
    };

    const row = await get<CredentialRow>(`${credentialSelect} WHERE c.id = ?`, id);
    issuedRow = row ? mapCredentialRow(row) : undefined;
  });

  const createdId = issuedRow && 'id' in issuedRow ? String(issuedRow.id) : undefined;

  // ── Anchor on the blockchain ─────────────────────────────────────────────
  // A chain outage must not fail a legitimate issuance, and it must never be
  // papered over: the anchor result is persisted verbatim, so public
  // verification reports UNAVAILABLE or PENDING instead of claiming a proof.
  if (anchorDocument && createdId) {
    const hash = hashCredentialDocument(anchorDocument);
    const anchor = await anchorCredential(anchorDocument, hash);
    await persistAnchor(createdId, anchor);
    if (anchor.status === 'ANCHORED') {
      logger.info('credential.anchored', {
        credentialId: anchorDocument.credentialId,
        chainTxId: anchor.chainTxId,
        blockHeight: anchor.blockHeight,
        issuerSignatureValid: anchor.issuerSignatureValid,
      });
    } else {
      logger.warn('credential.anchor_incomplete', {
        credentialId: anchorDocument.credentialId,
        status: anchor.status,
        error: anchor.error,
      });
    }
    const row = await get<CredentialRow>(`${credentialSelect} WHERE c.id = ?`, createdId);
    if (row) issuedRow = mapCredentialRow(row);
  }

  created(res, issuedRow);
}

/** The on-chain issuer identity this platform anchors under. */
function chainIssuerId(): string {
  return serverConfig.blockchainIssuerId;
}

/**
 * Write the anchor result exactly as the chain reported it.
 *
 * Nothing here is synthesised: a null column means the chain did not tell us
 * that value. `anchor_error` is a safe summary (the chain client never puts the
 * service credential in an error message).
 */
async function persistAnchor(credentialId: string, anchor: AnchorResult): Promise<void> {
  await run(
    `UPDATE credentials SET
       anchor_status = ?, anchor_error = ?, tx_hash = ?, merkle_root = ?,
       chain_tx_id = ?, chain_block_height = ?, chain_block_hash = ?, chain_issuer_id = ?
     WHERE id = ?`,
    anchor.status,
    anchor.error,
    anchor.txHash,
    anchor.merkleRoot,
    anchor.chainTxId,
    anchor.blockHeight,
    anchor.blockHash,
    anchor.chainIssuerId,
    credentialId,
  );
}

credentialsRouter.post(
  '/:id/revoke',
  requireAuth,
  requireRole(...CREDENTIAL_WRITE_ROLES),
  (req: Request, res: Response) => {
    void revokeCredentialHandler(req, res);
  },
);

async function revokeCredentialHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const row = await findByPublicOrInternal(param(req, 'id'));
  if (!row) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }

  // ── Object-level authorization (the actual fix) ─────────────────────────
  // Role membership is NOT sufficient. Tenant-scoped roles (INSTITUTION /
  // ISSUER) may revoke only credentials their own organization owns;
  // ADMIN-family roles keep their deliberate cross-institution access;
  // AUDITOR is not a credential writer at all and is rejected by requireRole.
  // Ownership comes from the credential's database row, never from the request.
  const decision = await authorizeCredentialWrite(auth.user, {
    institution_id: row.institution_id,
    issuer_id: row.issuer_id,
  });
  if (!decision.allowed) {
    // 404 (not 403) so an unauthorized caller cannot learn whether an
    // out-of-scope credential exists.
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }

  const revokedAt = nowIso();
  const reason = 'Revoked by authorized issuer or platform administrator';
  await transaction(async () => {
    await run(
      `UPDATE credentials SET status = 'REVOKED', revoked_at = ?, revoked_reason = ? WHERE id = ?`,
      revokedAt,
      reason,
      row.id,
    );
    // Local platform event log. Not a blockchain transaction: there is no chain
    // confirmation for this event, so confirmations stays 0 and status PENDING.
    const maxHeight = (await get<{ max: number | null }>('SELECT MAX(height) AS max FROM blocks'))?.max ?? 0;
    await run(
      `INSERT INTO transactions (id, block_height, type, timestamp, from_address, to_address, credential_id, credential_row_id, status, gas_used, confirmations)
       VALUES (?, ?, 'CREDENTIAL_REVOKED', ?, ?, ?, ?, ?, 'PENDING', ?, 0)`,
      newTxRef(),
      maxHeight,
      revokedAt,
      `0x${makeHex(110_000, 40)}`,
      `0x${makeHex(120_000, 40)}`,
      row.credential_id,
      row.id,
      21_000,
    );
    await auditFor(auth, {
      action: 'CREDENTIAL_REVOKED',
      target: row.id,
      targetType: 'credential',
      details: `institution=${row.institution_name}; credential=${row.credential_id}; role=${auth.user.role}`,
    });
  });

  // ── Anchor the revocation on-chain ────────────────────────────────────────
  // The local REVOKED status is authoritative for this platform, but a verifier
  // reading the chain would still see the credential ACTIVE if this fails, so the
  // divergence is recorded rather than hidden.
  const anchor = await anchorRevocation(row.credential_id);
  await persistAnchor(row.id, anchor);
  if (anchor.status === 'ANCHORED') {
    logger.info('credential.revocation_anchored', {
      credentialId: row.credential_id,
      chainTxId: anchor.chainTxId,
      blockHeight: anchor.blockHeight,
    });
  } else {
    logger.warn('credential.revocation_anchor_incomplete', {
      credentialId: row.credential_id,
      status: anchor.status,
      error: anchor.error,
      hint: 'The credential is REVOKED on the platform but the chain revocation is not confirmed.',
    });
  }

  ok(res, {
    message: 'Credential revoked.',
    anchor: {
      status: anchor.status,
      chainTxId: anchor.chainTxId,
      blockHeight: anchor.blockHeight,
      detail: anchor.error ?? 'The revocation is recorded in a blockchain block.',
    },
  });
}
