import { Router, Request, Response } from 'express';
import { all, get } from '../db/database.js';
import {
  mapInstitutionRow,
  mapIssuerRow,
  mapAuditRow,
  type AuditRow,
  type InstitutionRow,
  type IssuerRow,
} from '../db/mappers.js';
import { fail, ok, param } from '../utils/http.js';

export const institutionsRouter = Router();

const institutionListSql = `
  SELECT i.id, i.name, i.type, i.website, i.verified, i.status, i.created_at,
    (SELECT COUNT(*) FROM credentials c WHERE c.institution_id = i.id) AS credential_count,
    (SELECT COUNT(*) FROM issuers k WHERE k.institution_id = i.id) AS issuer_count
  FROM institutions i
`;

institutionsRouter.get('/', (_req: Request, res: Response) => {
  const rows = all<InstitutionRow>(`${institutionListSql} ORDER BY i.created_at DESC`);
  return ok(res, rows.map(mapInstitutionRow));
});

institutionsRouter.get('/:id', (req: Request, res: Response) => {
  const row = get<InstitutionRow>(`${institutionListSql} WHERE i.id = ?`, param(req, 'id'));
  if (!row) {
    return fail(res, 404, 'INSTITUTION_NOT_FOUND', 'Institution not found.');
  }
  return ok(res, mapInstitutionRow(row));
});

const DAY = 86_400_000;

institutionsRouter.get('/:id/stats', (req: Request, res: Response) => {
  const id = param(req, 'id');
  const institution = get<{ id: string }>('SELECT id FROM institutions WHERE id = ?', id);
  if (!institution) {
    return fail(res, 404, 'INSTITUTION_NOT_FOUND', 'Institution not found.');
  }

  const credentials = all<{ status: string; issued_at: string }>(
    'SELECT status, issued_at FROM credentials WHERE institution_id = ?',
    id,
  );
  const issuers = all<{ status: string; created_at: string }>(
    'SELECT status, created_at FROM issuers WHERE institution_id = ?',
    id,
  );

  const monthAgo = Date.now() - 30 * DAY;
  const issuedThisMonth = credentials.filter(
    (c) => new Date(c.issued_at).getTime() > monthAgo,
  ).length;

  return ok(res, {
    totalCredentials: credentials.length,
    activeCredentials: credentials.filter((c) => c.status === 'VALID').length,
    revokedCredentials: credentials.filter((c) => c.status === 'REVOKED').length,
    suspendedCredentials: credentials.filter(
      (c) => c.status === 'SUSPENDED' || c.status === 'SUSPICIOUS',
    ).length,
    expiredCredentials: credentials.filter((c) => c.status === 'EXPIRED').length,
    totalIssuers: issuers.length,
    activeIssuers: issuers.filter((i) => i.status === 'ACTIVE').length,
    credentialsIssuedThisMonth: issuedThisMonth,
    verificationCount: 1284,
    avgVerificationTimeSec: 3.4,
    recentActivity: [
      { label: 'Credentials Issued', value: issuedThisMonth, change: 12 },
      { label: 'Credentials Verified', value: 1284, change: 8 },
      {
        label: 'New Issuers',
        value: issuers.filter((i) => new Date(i.created_at).getTime() > monthAgo).length,
        change: -2,
      },
      {
        label: 'Revocations',
        value: credentials.filter((c) => c.status === 'REVOKED').length,
        change: 3,
      },
    ],
  });
});

institutionsRouter.get('/:id/issuers', (req: Request, res: Response) => {
  const rows = all<IssuerRow>(
    `SELECT k.id, k.name, k.institution_id, k.email, k.public_key, k.status, k.credentials_issued, k.created_at,
            i.name AS institution_name
     FROM issuers k JOIN institutions i ON i.id = k.institution_id
     WHERE k.institution_id = ? ORDER BY k.created_at DESC`,
    param(req, 'id'),
  );
  return ok(res, rows.map(mapIssuerRow));
});

institutionsRouter.get('/:id/audit-logs', (req: Request, res: Response) => {
  const rows = all<AuditRow>(
    `SELECT * FROM audit_events WHERE details LIKE ? ORDER BY timestamp DESC`,
    `%${param(req, 'id')}%`,
  );
  return ok(res, rows.map(mapAuditRow));
});