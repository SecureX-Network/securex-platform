import { Router, Request, Response } from 'express';
import { all, get, run } from '../db/database.js';
import {
  mapVerificationHistoryRow,
  type CredentialRow,
  type VerificationHistoryRow,
} from '../db/mappers.js';
import {
  toPublicNotFoundDto,
  toPublicVerificationDto,
  type PublicVerificationDto,
} from '../dto/publicVerification.js';
import { fail, ok, param } from '../utils/http.js';
import { entityId } from '../utils/ids.js';

export const verificationsRouter = Router();

/**
 * Public credential verification.
 *
 * This endpoint is unauthenticated, so it serves ONLY the dedicated public DTO
 * (server/dto/publicVerification.ts). It intentionally does not use
 * mapCredentialRow: the internal credential id, holder identity, metadata,
 * signature, Merkle root, internal institution/issuer ids and fraud internals
 * are never included in a public verification response.
 *
 * Authenticated institution/admin surfaces that legitimately need those fields
 * keep using /api/credentials and /api/admin/*, which are unchanged.
 */
async function credentialByPublicId(credentialId: string): Promise<CredentialRow | undefined> {
  return get<CredentialRow>(
    `SELECT c.id, c.credential_id, c.type, c.title, c.description, c.holder_name, c.holder_id,
            c.issuer_id, c.institution_id, c.status, c.issued_at, c.expires_at, c.revoked_at,
            c.revoked_reason, c.tx_hash, c.merkle_root, c.digital_signature, c.template_id, c.metadata_json,
            k.name AS issuer_name, i.name AS institution_name
     FROM credentials c
     JOIN issuers k ON k.id = c.issuer_id
     JOIN institutions i ON i.id = c.institution_id
     WHERE c.credential_id = ? OR c.id = ?`,
    credentialId,
    credentialId,
  );
}

async function recordVerification(
  credentialId: string,
  credentialRowId: string | undefined,
  credentialTitle: string,
  result: string,
  method: string,
): Promise<void> {
  await run(
    `INSERT INTO verification_history (id, credential_id, credential_row_id, credential_title, verified_at, verified_by, result, method, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entityId('vh'),
    credentialId,
    credentialRowId ?? null,
    credentialTitle,
    new Date().toISOString(),
    'Web Verification Portal',
    result,
    method,
    null,
  );
}

function isValidSha256Hex(hash: string): boolean {
  return /^[\da-f]{64}$/i.test(hash);
}

async function buildVerification(credentialId: string, documentHash?: string): Promise<PublicVerificationDto> {
  const row = await credentialByPublicId(credentialId);
  const verifiedAt = new Date().toISOString();

  if (!row) {
    await recordVerification(credentialId, undefined, 'Unknown', 'NOT_FOUND', 'API');
    return toPublicNotFoundDto(credentialId, verifiedAt);
  }

  const dto = toPublicVerificationDto({ row, documentHash, verifiedAt });
  await recordVerification(row.credential_id, row.id, row.title, dto.status, 'API');
  return dto;
}

verificationsRouter.get('/', (req: Request, res: Response) => {
  void verifyHandler(req, res);
});

async function verifyHandler(req: Request, res: Response): Promise<void> {
  const credentialId = typeof req.query.credentialId === 'string' ? req.query.credentialId : '';
  if (!credentialId) {
    fail(res, 400, 'MISSING_CREDENTIAL_ID', 'Missing required field: credentialId');
    return;
  }
  const documentHash = typeof req.query.hash === 'string' ? req.query.hash : undefined;
  if (documentHash && !isValidSha256Hex(documentHash)) {
    fail(res, 400, 'INVALID_HASH_FORMAT', 'Invalid document hash. Expected a 64-character hexadecimal string.');
    return;
  }
  ok(res, await buildVerification(credentialId, documentHash));
}

verificationsRouter.get('/history', (req: Request, res: Response) => {
  void historyHandler(req, res);
});

async function historyHandler(req: Request, res: Response): Promise<void> {
  void req.query.employerId;
  const rows = await all<VerificationHistoryRow>(
    'SELECT * FROM verification_history ORDER BY verified_at DESC',
  );
  ok(res, rows.map(mapVerificationHistoryRow));
}

verificationsRouter.get('/search', (req: Request, res: Response) => {
  void searchHandler(req, res);
});

async function searchHandler(req: Request, res: Response): Promise<void> {
  const credentialId = typeof req.query.credentialId === 'string' ? req.query.credentialId : '';
  if (!credentialId) {
    fail(res, 400, 'MISSING_CREDENTIAL_ID', 'Missing required field: credentialId');
    return;
  }
  const documentHash = typeof req.query.hash === 'string' ? req.query.hash : undefined;
  if (documentHash && !isValidSha256Hex(documentHash)) {
    fail(res, 400, 'INVALID_HASH_FORMAT', 'Invalid document hash. Expected a 64-character hexadecimal string.');
    return;
  }
  ok(res, await buildVerification(credentialId, documentHash));
}

/**
 * Canonical path-form verification: GET /verifications/:id resolves the public
 * SecureX credential identity (the same SX-... value carried in QR codes,
 * wallet shares and verification URLs). Registered after /history and /search
 * so those literal segments always win.
 */
verificationsRouter.get('/:id', (req: Request, res: Response) => {
  void verifyPathHandler(req, res);
});

async function verifyPathHandler(req: Request, res: Response): Promise<void> {
  const credentialId = param(req, 'id');
  const documentHash = typeof req.query.hash === 'string' ? req.query.hash : undefined;
  if (documentHash && !isValidSha256Hex(documentHash)) {
    fail(res, 400, 'INVALID_HASH_FORMAT', 'Invalid document hash. Expected a 64-character hexadecimal string.');
    return;
  }
  ok(res, await buildVerification(credentialId, documentHash));
}
