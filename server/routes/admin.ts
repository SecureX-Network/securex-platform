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

adminRouter.get('/stats', ...adminGuard, (req: Request, res: Response) => {
  void statsHandler(req, res);
});

async function statsHandler(_req: Request, res: Response): Promise<void> {
  const monthAgo = new Date(Date.now() - 30 * DAY).toISOString();
  const dayAgo = new Date(Date.now() - DAY).toISOString();

  const count = async (table: string) => (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n ?? 0;

  const roleCounts = await all<{ role: string; n: number }>(
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

  const activeAlerts = (await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM security_alerts WHERE status IN ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING')`,
  ))?.n ?? 0;
  const dailyActiveUsers = (await get<{ n: number }>(
    'SELECT COUNT(DISTINCT id) AS n FROM users WHERE last_login_at >= ?',
    dayAgo,
  ))?.n ?? 0;

  ok(res, {
    totalUsers: await count('users'),
    totalInstitutions: await count('institutions'),
    totalIssuers: await count('issuers'),
    totalCredentials: await count('credentials'),
    totalVerifications: await count('verification_history'),
    activeAlerts,
    totalTransactions: await count('transactions'),
    dailyActiveUsers,
    registeredThisMonth,
  });
}

adminRouter.get('/institutions', ...adminGuard, (_req: Request, res: Response) => {
  void institutionsHandler(res);
});

async function institutionsHandler(res: Response): Promise<void> {
  const rows = await all<InstitutionRow>(
    `SELECT i.id, i.name, i.type, i.website, i.verified, i.status, i.created_at,
            (SELECT COUNT(*) FROM credentials c WHERE c.institution_id = i.id) AS credential_count,
            (SELECT COUNT(*) FROM issuers k WHERE k.institution_id = i.id) AS issuer_count
     FROM institutions i ORDER BY i.created_at DESC`,
  );
  ok(res, rows.map(mapInstitutionRow));
}

adminRouter.get('/users', ...adminGuard, (_req: Request, res: Response) => {
  void usersHandler(res);
});

async function usersHandler(res: Response): Promise<void> {
  const rows = await all<UserRow>(
    'SELECT id, email, name, role, institution_id, password_hash, created_at, last_login_at FROM users ORDER BY created_at DESC',
  );
  ok(res, rows.map(mapUserRow));
}

adminRouter.get('/issuers', ...adminGuard, (_req: Request, res: Response) => {
  void issuersHandler(res);
});

async function issuersHandler(res: Response): Promise<void> {
  const rows = await all<IssuerRow>(
    `SELECT k.id, k.name, k.institution_id, k.email, k.public_key, k.status, k.credentials_issued, k.created_at,
            i.name AS institution_name
     FROM issuers k JOIN institutions i ON i.id = k.institution_id
     ORDER BY k.created_at DESC`,
  );
  ok(res, rows.map(mapIssuerRow));
}

adminRouter.get('/security/alerts', ...adminGuard, (_req: Request, res: Response) => {
  void securityAlertsHandler(res);
});

async function securityAlertsHandler(res: Response): Promise<void> {
  const rows = await all<SecurityAlertRow>('SELECT * FROM security_alerts ORDER BY created_at DESC');
  ok(res, rows.map(mapAlertRow));
}

adminRouter.get('/security/audit', ...adminGuard, (_req: Request, res: Response) => {
  void auditHandler(res);
});

async function auditHandler(res: Response): Promise<void> {
  const rows = await all<AuditRow>('SELECT * FROM audit_events ORDER BY timestamp DESC');
  ok(res, rows.map(mapAuditRow));
}

adminRouter.get('/security/fraud', ...adminGuard, (_req: Request, res: Response) => {
  void fraudHandler(res);
});

async function fraudHandler(res: Response): Promise<void> {
  const rows = await all<RiskAssessmentRow>('SELECT * FROM risk_assessments ORDER BY assessed_at DESC');
  ok(res, rows.map(mapRiskAssessmentRow));
}

adminRouter.get('/security/overview', ...adminGuard, (_req: Request, res: Response) => {
  void securityOverviewHandler(res);
});

async function securityOverviewHandler(res: Response): Promise<void> {
  ok(res, await getSecurityOverview());
}

adminRouter.get('/security/service-health', ...adminGuard, async (_req: Request, res: Response) => {
  const health = await getServiceHealth();
  ok(res, health);
});

adminRouter.get('/security/sessions', ...adminGuard, (_req: Request, res: Response) => {
  void sessionsHandler(res);
});

async function sessionsHandler(res: Response): Promise<void> {
  ok(res, await getActiveSessions());
}

adminRouter.get('/security/credential-integrity', ...adminGuard, (_req: Request, res: Response) => {
  void credentialIntegrityHandler(res);
});

async function credentialIntegrityHandler(res: Response): Promise<void> {
  ok(res, await getCredentialIntegrityStats());
}

adminRouter.post(
  '/security/alerts/:id/status',
  ...adminGuard,
  validate([{ name: 'status', required: true, enum: ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'] }]),
  (req: Request, res: Response) => {
    void alertStatusHandler(req, res);
  },
);

async function alertStatusHandler(req: Request, res: Response): Promise<void> {
  const { status } = req.body as { status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED' };
  const alertId = param(req, 'id');
  const alert = await get<{ id: string; title: string }>('SELECT id, title FROM security_alerts WHERE id = ?', alertId);
  if (!alert) {
    fail(res, 404, 'ALERT_NOT_FOUND', 'Security alert not found.');
    return;
  }
  await updateAlertStatus(alertId, status);
  await auditFor(req as AuthenticatedRequest, {
    action: status === 'ACKNOWLEDGED'
      ? 'SECURITY_ALERT_ACKNOWLEDGED'
      : status === 'RESOLVED' || status === 'DISMISSED'
        ? 'SECURITY_ALERT_RESOLVED'
        : 'SECURITY_ALERT_UPDATED',
    target: alert.id,
    targetType: 'alert',
    details: `title=${alert.title}; status transitioned to ${status}`,
  });
  ok(res, { message: 'Alert status updated.' });
}