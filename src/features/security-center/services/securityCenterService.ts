import { IS_MOCK } from '@/constants';
import { mockDelay } from '@/services/mock';
import { fetchAPI, unwrapResponse } from '@/services/api/client';
import {
  getSecurityAlerts as getAdminSecurityAlerts,
  getAuditEvents as getAdminAuditEvents,
  getFraudAlerts as getAdminFraudAlerts,
} from '@/services/api/adminService';
import {
  MOCK_CREDENTIALS,
  MOCK_SECURITY_ALERTS,
  MOCK_AUDIT_EVENTS,
  MOCK_RISK_ASSESSMENTS,
  MOCK_VERIFICATION_HISTORY,
} from '@/services/mock';
import type {
  SecurityOverviewData,
  SecurityServiceHealth,
  SecuritySession,
  CredentialIntegrityStats,
  SecurityActivityItem,
} from '../types/security';
import type { SecurityAlert, AuditEvent, RiskAssessment } from '@/types';

function computeSecurityScore(alerts: SecurityAlert[]): number {
  const active = alerts.filter(
    (a) => !['RESOLVED', 'DISMISSED'].includes(a.status),
  ).length;
  const criticalWeight = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highWeight = alerts.filter((a) => a.severity === 'HIGH').length;
  const raw = 100 - active * 8 - criticalWeight * 10 - highWeight * 4;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function computeCredentialStats(): CredentialIntegrityStats {
  const creds = MOCK_CREDENTIALS;
  return {
    total: creds.length,
    valid: creds.filter((c) => c.status === 'VALID').length,
    revoked: creds.filter((c) => c.status === 'REVOKED').length,
    expired: creds.filter((c) => c.status === 'EXPIRED').length,
    tampered: creds.filter((c) => c.status === 'TAMPERED').length,
    suspicious: creds.filter((c) => c.status === 'SUSPICIOUS').length,
  };
}

const MOCK_SERVICE_HEALTH: SecurityServiceHealth[] = [
  {
    name: 'Platform API',
    status: 'OPERATIONAL',
    lastChecked: new Date().toISOString(),
    responseTimeMs: 42,
    description: 'Core credential management and authentication service',
  },
  {
    name: 'Blockchain Network',
    status: 'OPERATIONAL',
    lastChecked: new Date().toISOString(),
    responseTimeMs: 87,
    description: 'Distributed ledger for immutable credential records',
  },
  {
    name: 'Verification Engine',
    status: 'OPERATIONAL',
    lastChecked: new Date().toISOString(),
    responseTimeMs: 31,
    description: 'Real-time credential verification and fraud detection',
  },
  {
    name: 'Fraud Detection Engine',
    status: 'DEGRADED',
    lastChecked: new Date().toISOString(),
    responseTimeMs: 230,
    description: 'ML-based fraud and tampering analysis service',
  },
  {
    name: 'Authentication Service',
    status: 'OPERATIONAL',
    lastChecked: new Date().toISOString(),
    responseTimeMs: 18,
    description: 'Multi-factor authentication and session management',
  },
  {
    name: 'Network Validators',
    status: 'OPERATIONAL',
    lastChecked: new Date().toISOString(),
    responseTimeMs: 156,
    description: 'Block propagation and consensus validation nodes',
  },
];

const MOCK_SESSIONS: SecuritySession[] = [
  {
    sessionId: 'sess-001',
    user: 'Alex Morgan',
    role: 'ADMIN',
    ipAddress: '10.0.8.10',
    device: 'macOS Chrome 128',
    location: 'San Francisco, CA',
    startedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    lastActivityAt: new Date(Date.now() - 300000).toISOString(),
    isActive: true,
  },
  {
    sessionId: 'sess-002',
    user: 'Jamie Rivers',
    role: 'SECURITY_ADMIN',
    ipAddress: '10.0.8.22',
    device: 'Windows Edge 128',
    location: 'New York, NY',
    startedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    lastActivityAt: new Date(Date.now() - 900000).toISOString(),
    isActive: true,
  },
  {
    sessionId: 'sess-003',
    user: 'Taylor Brooks',
    role: 'NETWORK_ADMIN',
    ipAddress: '10.0.8.33',
    device: 'Linux Firefox 130',
    location: 'Austin, TX',
    startedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
    isActive: false,
  },
];

function buildActivityFromAudit(event: AuditEvent): SecurityActivityItem {
  const severityMap: Record<string, SecurityActivityItem['severity']> = {
    CREDENTIAL_ISSUED: 'LOW',
    CREDENTIAL_VERIFIED: 'LOW',
    CREDENTIAL_REVOKED: 'MEDIUM',
    CREDENTIAL_SUSPENDED: 'MEDIUM',
    USER_LOGIN: 'LOW',
    INSTITUTION_REGISTERED: 'LOW',
    SECURITY_ALERT_ACKNOWLEDGED: 'MEDIUM',
    SYSTEM_CONFIG_CHANGE: 'MEDIUM',
    ISSUER_STATUS_CHANGED: 'MEDIUM',
  };

  return {
    id: event.id,
    action: event.action as SecurityActivityItem['action'],
    actor: event.actor,
    actorRole: event.actorRole,
    target: event.target,
    targetType: event.targetType,
    details: event.details,
    ipAddress: event.ipAddress,
    timestamp: event.timestamp,
    severity: severityMap[event.action] ?? 'LOW',
  };
}

// ---------------------------------------------------------------------------
// Data sources
//
// Lists backed by existing backend endpoints are reused from the shared admin
// service layer (Platform API): /admin/security/alerts, /admin/security/audit
// and /admin/security/fraud. Aggregates (overview, service health, sessions,
// credential-integrity) and the alert lifecycle mutation are served by the
// Platform API under /admin/security/. The Explorer simulation is the only
// surface with no backend contract, so it stays mock-only.
// ---------------------------------------------------------------------------

export async function getSecurityAlerts(): Promise<SecurityAlert[]> {
  return getAdminSecurityAlerts();
}

export async function getSecurityEvents(): Promise<SecurityActivityItem[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_AUDIT_EVENTS.map(buildActivityFromAudit);
  }

  const events = await getAdminAuditEvents();
  return events.map(buildActivityFromAudit);
}

export async function getRiskAssessments(): Promise<RiskAssessment[]> {
  return getAdminFraudAlerts();
}

export async function getSecurityOverview(): Promise<SecurityOverviewData> {
  if (IS_MOCK) {
    await mockDelay();
    const score = computeSecurityScore(MOCK_SECURITY_ALERTS);
    const active = MOCK_SECURITY_ALERTS.filter(
      (a) => !['RESOLVED', 'DISMISSED'].includes(a.status),
    ).length;
    const critical = MOCK_SECURITY_ALERTS.filter(
      (a) => a.severity === 'CRITICAL' && !['RESOLVED', 'DISMISSED'].includes(a.status),
    ).length;
    const high = MOCK_SECURITY_ALERTS.filter(
      (a) => a.severity === 'HIGH' && !['RESOLVED', 'DISMISSED'].includes(a.status),
    ).length;

    return {
      securityScore: score,
      overallStatus: score >= 80 ? 'STRONG' : score >= 60 ? 'MODERATE' : 'NEEDS_ATTENTION',
      activeAlerts: active,
      criticalAlerts: critical,
      highAlerts: high,
      suspiciousEvents24h: MOCK_RISK_ASSESSMENTS.filter(
        (r) => new Date(r.assessedAt).getTime() > Date.now() - 86400000,
      ).length,
      credentialsMonitored: MOCK_CREDENTIALS.length,
      verificationsToday: MOCK_VERIFICATION_HISTORY.filter(
        (v) => new Date(v.verifiedAt).getTime() > Date.now() - 86400000,
      ).length,
      lastUpdated: new Date().toISOString(),
    };
  }

  const response = await fetchAPI<SecurityOverviewData>('/admin/security/overview');
  return unwrapResponse(response);
}

export async function getServiceHealth(): Promise<SecurityServiceHealth[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_SERVICE_HEALTH.map((s) => ({
      ...s,
      lastChecked: new Date().toISOString(),
    }));
  }

  const response = await fetchAPI<SecurityServiceHealth[]>('/admin/security/service-health');
  return unwrapResponse(response);
}

export async function getActiveSessions(): Promise<SecuritySession[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_SESSIONS;
  }

  const response = await fetchAPI<SecuritySession[]>('/admin/security/sessions');
  return unwrapResponse(response);
}

export async function getCredentialIntegrityStats(): Promise<CredentialIntegrityStats> {
  if (IS_MOCK) {
    await mockDelay();
    return computeCredentialStats();
  }

  const response = await fetchAPI<CredentialIntegrityStats>('/admin/security/credential-integrity');
  return unwrapResponse(response);
}

export async function updateAlertStatus(
  alertId: string,
  status: SecurityAlert['status'],
): Promise<void> {
  if (IS_MOCK) {
    await mockDelay();
    return;
  }

  await fetchAPI<void>(`/admin/security/alerts/${alertId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}