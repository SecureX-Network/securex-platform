import { Router, Request, Response } from 'express';
import { all, get, run } from '../db/database.js';
import { mapCredentialRow, type CredentialRow } from '../db/mappers.js';
import { requireAuth, requireRole, type AuthenticatedRequest, type UserRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditFor } from '../services/audit.js';
import { created, fail, ok, param } from '../utils/http.js';
import { makeHex, newPublicCredentialId, randomToken, nowIso } from '../utils/ids.js';

export const credentialsRouter = Router();

const CREDENTIAL_WRITER_ROLES: UserRole[] = ['INSTITUTION', 'ISSUER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'];

const credentialSelect = `
  SELECT c.id, c.credential_id, c.type, c.title, c.description, c.holder_name, c.holder_id,
         c.issuer_id, c.institution_id, c.status, c.issued_at, c.expires_at, c.revoked_at,
         c.revoked_reason, c.tx_hash, c.merkle_root, c.digital_signature, c.template_id, c.metadata_json,
         k.name AS issuer_name, i.name AS institution_name
  FROM credentials c
  JOIN issuers k ON k.id = c.issuer_id
  JOIN institutions i ON i.id = c.institution_id
`;

function findByPublicOrInternal(id: string): CredentialRow | undefined {
  return get<CredentialRow>(
    `${credentialSelect} WHERE c.id = ? OR c.credential_id = ?`,
    id,
    id,
  );
}

credentialsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const holderId = typeof req.query.holderId === 'string' ? req.query.holderId : undefined;
  const rows = holderId
    ? all<CredentialRow>(
        `${credentialSelect} WHERE c.holder_id = ? ORDER BY c.issued_at DESC`,
        holderId,
      )
    : all<CredentialRow>(`${credentialSelect} ORDER BY c.issued_at DESC`);
  return ok(res, rows.map(mapCredentialRow));
});

credentialsRouter.get('/:id', requireAuth, (req: Request, res: Response) => {
  const row = findByPublicOrInternal(param(req, 'id'));
  if (!row) {
    return fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
  }
  return ok(res, mapCredentialRow(row));
});

credentialsRouter.post(
  '/',
  requireAuth,
  requireRole(...CREDENTIAL_WRITER_ROLES),
  validate([
    { name: 'type', required: true, type: 'string' },
    { name: 'title', required: true, type: 'string' },
    { name: 'description', required: true, type: 'string' },
    { name: 'holderName', required: true, type: 'string' },
    { name: 'holderId', required: true, type: 'string' },
    { name: 'issuerId', required: true, type: 'string' },
    { name: 'issuerName', required: true, type: 'string' },
    { name: 'institutionId', required: true, type: 'string' },
    { name: 'institutionName', required: true, type: 'string' },
    { name: 'templateId', type: 'string' },
    { name: 'expiresAt', type: 'string' },
    { name: 'metadata', type: 'object' },
  ]),
  (req: Request, res: Response) => {
    const auth = req as AuthenticatedRequest;
    const body = req.body as {
      type: string;
      title: string;
      description: string;
      holderName: string;
      holderId: string;
      issuerId: string;
      issuerName: string;
      institutionId: string;
      institutionName: string;
      templateId?: string;
      expiresAt?: string;
      metadata?: Record<string, string>;
    };

    const issuer = get<{ id: string }>('SELECT id FROM issuers WHERE id = ?', body.issuerId);
    const institution = get<{ id: string }>('SELECT id FROM institutions WHERE id = ?', body.institutionId);
    if (!issuer) return fail(res, 400, 'UNKNOWN_ISSUER', 'Issuer not found.');
    if (!institution) return fail(res, 400, 'UNKNOWN_INSTITUTION', 'Institution not found.');

    const id = `cred-${Date.now().toString(36)}-${randomToken(6)}`;
    const credentialId = newPublicCredentialId(Date.now() % 9000);
    const issuedAt = nowIso();
    run(
      `INSERT INTO credentials (id, credential_id, type, title, description, holder_name, holder_id,
         issuer_id, institution_id, status, issued_at, expires_at, tx_hash, merkle_root, digital_signature, template_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID', ?, ?, ?, ?, ?, ?, ?)`,
      id,
      credentialId,
      body.type,
      body.title,
      body.description,
      body.holderName,
      body.holderId,
      body.issuerId,
      body.institutionId,
      issuedAt,
      body.expiresAt ?? null,
      `0x${makeHex(Date.now() % 100000)}`,
      makeHex((Date.now() % 100000) + 1000),
      makeHex((Date.now() % 100000) + 2000),
      body.templateId ?? null,
      body.metadata ? JSON.stringify(body.metadata) : null,
    );

    const top = get<{ max: number | null }>('SELECT MAX(height) AS max FROM blocks');
    const height = (top?.max ?? 0) + 1;
    run(
      `INSERT INTO transactions (id, block_height, type, timestamp, from_address, to_address, credential_id, status, gas_used, confirmations)
       VALUES (?, ?, 'CREDENTIAL_ISSUED', ?, ?, ?, ?, 'PENDING', ?, 0)`,
      `0x${makeHex(70_000 + (Date.now() % 90_000))}`,
      height,
      issuedAt,
      `0x${makeHex(80_000, 40)}`,
      `0x${makeHex(90_000, 40)}`,
      credentialId,
      21_000,
    );

    auditFor(auth, {
      action: 'CREDENTIAL_ISSUED',
      target: id,
      targetType: 'credential',
      details: `institution=${body.institutionName}; credential=${credentialId}; via web issue flow`,
    });

    const row = get<CredentialRow>(`${credentialSelect} WHERE c.id = ?`, id);
    return created(res, row ? mapCredentialRow(row) : undefined);
  },
);

credentialsRouter.post(
  '/:id/revoke',
  requireAuth,
  requireRole(...CREDENTIAL_WRITER_ROLES),
  (req: Request, res: Response) => {
    const auth = req as AuthenticatedRequest;
    const row = findByPublicOrInternal(param(req, 'id'));
    if (!row) {
      return fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    }
    const revokedAt = nowIso();
    run(
      `UPDATE credentials SET status = 'REVOKED', revoked_at = ?, revoked_reason = ? WHERE id = ?`,
      revokedAt,
      'Revoked by issuer',
      row.id,
    );
    const maxHeight = get<{ max: number | null }>('SELECT MAX(height) AS max FROM blocks')?.max ?? 0;
    run(
      `INSERT INTO transactions (id, block_height, type, timestamp, from_address, to_address, credential_id, status, gas_used, confirmations)
       VALUES (?, ?, 'CREDENTIAL_REVOKED', ?, ?, ?, ?, 'CONFIRMED', ?, 24)`,
      `0x${makeHex(100_000 + (Date.now() % 90_000))}`,
      maxHeight,
      revokedAt,
      `0x${makeHex(110_000, 40)}`,
      `0x${makeHex(120_000, 40)}`,
      row.credential_id,
      21_000,
    );
    auditFor(auth, {
      action: 'CREDENTIAL_REVOKED',
      target: row.id,
      targetType: 'credential',
      details: `institution=${row.institution_name}; credential=${row.credential_id}; reason=${row.revoked_reason}`,
    });
    return ok(res, { message: 'Credential revoked.' });
  },
);