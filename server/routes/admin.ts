import { Router, Request, Response } from 'express';
import { all, get } from '../db/database.js';
import {
  mapAlertRow,
  mapAuditRow,
  mapInstitutionRow,
  mapIssuerRow,
  mapRiskAssessmentRow,
  mapUserRow,
  type AuditRow,
  type InstitutionRow,
  type IssuerRow,
  type RiskAssessmentRow,
  type SecurityAlertRow,
  type UserRow,
} from '../db/mappers.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditFor } from '../services/audit.js';
import {
  getActiveSessions,
  getCredentialIntegrityStats,
  getSecurityOverview,
  getServiceHealth,
  updateAlertStatus,
} from '../services/security.js';
import { fail, ok, param } from '../utils/http.js';

export const adminRouter = Router();

const ADMIN_ROLES = ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] as const;
const adminGuard = [requireAuth, requireRole(...ADMIN_ROLES)];

const DAY = 86_400_000;

adminRouter.get('/stats', ...adminGuard, (_req: Request, res: Response) => {
  const monthAgo = new Date(Date.now() - 30 * DAY).toISOString();
  const dayAgo = new Date(Date.now() - DAY).toISOString();

  const count = (table: string) => get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)?.n ?? 0;

  const roleCounts = all<{ role: string; n: number }>(
    'SELECT role, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY role',
    monthAgo,
  );
  const byRole = new Map(roleCounts.map((r) => [r.role, Number(r.n)]));
  const registeredThisMonth = [
    { label: 'Holders', value: byRole.get('HOLDER') ?? 0 },
    { label: 'Employers', value: byRole.get('EMPLOYER') ?? 0 },
    { label: 'Institutions', value: byRole.get('INSTITUTION') ?? 0 },
    { label: 'Issuers', value: byRole.get('ISSUER') ?? 0 },
  ];

  const activeAlerts = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM security_alerts WHERE status IN ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING')`,
  )?.n ?? 0;
  const dailyActiveUsers = get<{ n: number }>(
    'SELECT COUNT(DISTINCT id) AS n FROM users WHERE last_login_at >= ?',
    dayAgo,
  )?.n ?? 0;

  return ok(res, {
    totalUsers: count('users'),
    totalInstitutions: count('institutions'),
    totalIssuers: count('issuers'),
    totalCredentials: count('credentials'),
    totalVerifications: count('verification_history'),
    activeAlerts,
    totalTransactions: count('transactions'),
    dailyActiveUsers,
    registeredThisMonth,
  });
});

adminRouter.get('/institutions', ...adminGuard, (_req: Request, res: Response) => {
  const rows = all<InstitutionRow>(
    `SELECT i.id, i.name, i.type, i.website, i.verified, i.status, i.created_at,
            (SELECT COUNT(*) FROM credentials c WHERE c.institution_id = i.id) AS credential_count,
            (SELECT COUNT(*) FROM issuers k WHERE k.institution_id = i.id) AS issuer_count
     FROM institutions i ORDER BY i.created_at DESC`,
  );
  return ok(res, rows.map(mapInstitutionRow));
});

adminRouter.get('/users', ...adminGuard, (_req: Request, res: Response) => {
  const rows = all<UserRow>(
    'SELECT id, email, name, role, institution_id, password_hash, created_at, last_login_at FROM users ORDER BY created_at DESC',
  );
  return ok(res, rows.map(mapUserRow));
});

adminRouter.get('/issuers', ...adminGuard, (_req: Request, res: Response) => {
  const rows = all<IssuerRow>(
    `SELECT k.id, k.name, k.institution_id, k.email, k.public_key, k.status, k.credentials_issued, k.created_at,
            i.name AS institution_name
     FROM issuers k JOIN institutions i ON i.id = k.institution_id
     ORDER BY k.created_at DESC`,
  );
  return ok(res, rows.map(mapIssuerRow));
});

adminRouter.get('/security/alerts', ...adminGuard, (_req: Request, res: Response) => {
  const rows = all<SecurityAlertRow>('SELECT * FROM security_alerts ORDER BY created_at DESC');
  return ok(res, rows.map(mapAlertRow));
});

adminRouter.get('/security/audit', ...adminGuard, (_req: Request, res: Response) => {
  const rows = all<AuditRow>('SELECT * FROM audit_events ORDER BY timestamp DESC');
  return ok(res, rows.map(mapAuditRow));
});

adminRouter.get('/security/fraud', ...adminGuard, (_req: Request, res: Response) => {
  const rows = all<RiskAssessmentRow>('SELECT * FROM risk_assessments ORDER BY assessed_at DESC');
  return ok(res, rows.map(mapRiskAssessmentRow));
});

adminRouter.get('/security/overview', ...adminGuard, (_req: Request, res: Response) => {
  return ok(res, getSecurityOverview());
});

adminRouter.get('/security/service-health', ...adminGuard, async (_req: Request, res: Response) => {
  const health = await getServiceHealth();
  return ok(res, health);
});

adminRouter.get('/security/sessions', ...adminGuard, (_req: Request, res: Response) => {
  return ok(res, getActiveSessions());
});

adminRouter.get('/security/credential-integrity', ...adminGuard, (_req: Request, res: Response) => {
  return ok(res, getCredentialIntegrityStats());
});

adminRouter.post(
  '/security/alerts/:id/status',
  ...adminGuard,
  validate([{ name: 'status', required: true, enum: ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'] }]),
  (req: Request, res: Response) => {
    const { status } = req.body as { status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED' };
    const alertId = param(req, 'id');
    const alert = get<{ id: string; title: string }>('SELECT id, title FROM security_alerts WHERE id = ?', alertId);
    if (!alert) {
      return fail(res, 404, 'ALERT_NOT_FOUND', 'Security alert not found.');
    }
    updateAlertStatus(alertId, status);
    auditFor(req as AuthenticatedRequest, {
      action: status === 'ACKNOWLEDGED'
        ? 'SECURITY_ALERT_ACKNOWLEDGED'
        : status === 'RESOLVED' || status === 'DISMISSED'
          ? 'SECURITY_ALERT_RESOLVED'
          : 'SECURITY_ALERT_UPDATED',
      target: alert.id,
      targetType: 'alert',
      details: `title=${alert.title}; status transitioned to ${status}`,
    });
    return ok(res, { message: 'Alert status updated.' });
  },
);