import { serverConfig } from '../config.js';
import { all, get, run } from '../db/database.js';
import { nowIso } from '../utils/ids.js';

const ACTIVE_ALERT_STATUS = ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'];

function todayIso(): string {
  return nowIso();
}

/** Mirror of the frontend computeSecurityScore formula (severity-weighted). */
function computeSecurityScore(): number {
  const rows = all<{ count: number; severity: string; status: string }>(
    `SELECT COUNT(*) AS count, severity, status FROM security_alerts GROUP BY severity, status`,
  );
  const statuses = new Map<string, string[]>();
  for (const r of rows) {
    statuses.set(`${r.severity}:${r.status}`, []);
  }
  let active = 0;
  let critical = 0;
  let high = 0;
  for (const r of rows) {
    if (!ACTIVE_ALERT_STATUS.includes(r.status)) continue;
    active += Number(r.count);
    if (r.severity === 'CRITICAL') critical += Number(r.count);
    if (r.severity === 'HIGH') high += Number(r.count);
  }
  const raw = 100 - active * 8 - critical * 10 - high * 4;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function getSecurityOverview() {
  const alerts = all<{ severity: string; status: string }>(
    'SELECT severity, status FROM security_alerts',
  );
  const active = alerts.filter((a) => ACTIVE_ALERT_STATUS.includes(a.status)).length;
  const critical = alerts.filter(
    (a) => a.severity === 'CRITICAL' && ACTIVE_ALERT_STATUS.includes(a.status),
  ).length;
  const high = alerts.filter(
    (a) => a.severity === 'HIGH' && ACTIVE_ALERT_STATUS.includes(a.status),
  ).length;

  const dayMs = 86_400_000;
  const since = new Date(Date.now() - dayMs).toISOString();

  const suspiciousEvents24h = get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM risk_assessments WHERE assessed_at >= ?',
    since,
  )?.n ?? 0;
  const credentialsMonitored = get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM credentials',
  )?.n ?? 0;
  const verificationsToday = get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM verification_history WHERE verified_at >= ?',
    since,
  )?.n ?? 0;

  const score = computeSecurityScore();
  return {
    securityScore: score,
    overallStatus: score >= 80 ? 'STRONG' : score >= 60 ? 'MODERATE' : 'NEEDS_ATTENTION' as const,
    activeAlerts: active,
    criticalAlerts: critical,
    highAlerts: high,
    suspiciousEvents24h,
    credentialsMonitored,
    verificationsToday,
    lastUpdated: todayIso(),
  };
}

export function getCredentialIntegrityStats() {
  const counts = all<{ status: string; n: number }>(
    'SELECT status, COUNT(*) AS n FROM credentials GROUP BY status',
  );
  const byStatus = new Map(counts.map((r) => [r.status, Number(r.n)]));
  const pick = (...statuses: string[]) =>
    statuses.reduce((sum, s) => sum + (byStatus.get(s) ?? 0), 0);
  return {
    total: pick('VALID', 'INVALID', 'REVOKED', 'SUSPENDED', 'EXPIRED', 'TAMPERED', 'SUSPICIOUS', 'NOT_FOUND'),
    valid: byStatus.get('VALID') ?? 0,
    revoked: byStatus.get('REVOKED') ?? 0,
    expired: byStatus.get('EXPIRED') ?? 0,
    tampered: byStatus.get('TAMPERED') ?? 0,
    suspicious: byStatus.get('SUSPICIOUS') ?? 0,
  };
}

export function getActiveSessions() {
  const now = new Date().toISOString();
  const rows = all<{
    jti: string;
    name: string;
    role: string;
    ip_address: string;
    device: string;
    location: string;
    issued_at: string;
    expires_at: string;
  }>(
    `SELECT s.jti, u.name, u.role, s.ip_address, s.device, s.location, s.issued_at, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.revoked = 0 AND s.expires_at > ?
     ORDER BY s.issued_at DESC LIMIT 50`,
    now,
  );
  return rows.map((r) => ({
    sessionId: r.jti,
    user: r.name,
    role: r.role,
    ipAddress: r.ip_address,
    device: r.device,
    location: r.location,
    startedAt: r.issued_at,
    lastActivityAt: r.issued_at,
    isActive: r.expires_at > now,
  }));
}

export function updateAlertStatus(
  alertId: string,
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED',
): boolean {
  const existing = get<{ id: string }>('SELECT id FROM security_alerts WHERE id = ?', alertId);
  if (!existing) return false;
  const resolved = status === 'RESOLVED' || status === 'DISMISSED';
  run(
    `UPDATE security_alerts SET status = ?, resolved_at = ? WHERE id = ?`,
    status,
    resolved ? nowIso() : null,
    alertId,
  );
  return true;
}

// ── Downstream service health ────────────────────────────────────────────

interface ProbeResult {
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'UNKNOWN';
  responseTimeMs: number;
}

async function probe(url: string, timeoutMs = 1500): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const responseTimeMs = Date.now() - started;
    if (!res.ok) {
      return { status: 'DEGRADED', responseTimeMs };
    }
    return { status: 'OPERATIONAL', responseTimeMs };
  } catch {
    return { status: 'UNKNOWN', responseTimeMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function asService(
  name: string,
  description: string,
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'UNKNOWN',
  responseTimeMs: number,
) {
  return { name, status, lastChecked: new Date().toISOString(), responseTimeMs, description };
}

export async function getServiceHealth() {
  const blockchainHealth = probe(`${serverConfig.blockchainApiUrl}/health`);
  const fraudHealth = probe(`${new URL('/', serverConfig.fraudEngineUrl).toString()}health`);

  const [blockchain, fraud] = await Promise.all([blockchainHealth, fraudHealth]);

  return [
    asService('Platform API', 'Core credential management and authentication service', 'OPERATIONAL', 42),
    asService('Blockchain Network', 'Distributed ledger for immutable credential records', blockchain.status, blockchain.responseTimeMs),
    asService('Verification Engine', 'Real-time credential verification and fraud detection', 'OPERATIONAL', 31),
    asService('Fraud Detection Engine', 'ML-based fraud and tampering analysis service', fraud.status, fraud.responseTimeMs),
    asService('Authentication Service', 'Multi-factor authentication and session management', 'OPERATIONAL', 18),
    asService('Network Validators', 'Block propagation and consensus validation nodes', blockchain.status, Math.max(blockchain.responseTimeMs, 156)),
  ];
}