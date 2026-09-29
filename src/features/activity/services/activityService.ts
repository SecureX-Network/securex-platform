import { getHolderCredentials, getCredentials } from '@/services/api/credentialService';
import { getVerificationHistory } from '@/services/api/verificationService';
import { getAuditEvents, getSecurityAlerts } from '@/services/api/adminService';
import { getAuditLogs } from '@/services/api/institutionService';
import { fetchNotifications } from '@/features/notifications/services/notificationsService';
import type { UserRole, Credential, CredentialStatus } from '@/types';

export type ActivityKind = 'credential' | 'verification' | 'security' | 'system';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description?: string;
  timestamp: string;
  status?: CredentialStatus | 'RESOLVED';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

function credentialsToActivity(credentials: Credential[], limit: number): ActivityItem[] {
  return credentials
    .slice(0, limit)
    .map((c) => ({
      id: `cred-${c.id}`,
      kind: 'credential' as ActivityKind,
      title: c.title,
      description: `Issued to ${c.holderName}`,
      timestamp: c.issuedAt,
      status: c.status,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getActivity(role: UserRole, userId: string, institutionId?: string): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];
  try {
    if (role === 'ADMIN' || role === 'SECURITY_ADMIN' || role === 'NETWORK_ADMIN' || role === 'AUDITOR') {
      const [audit, alerts] = await Promise.all([getAuditEvents().catch(() => []), getSecurityAlerts().catch(() => [])]);
      for (const e of audit) {
        items.push({
          id: e.id,
          kind: 'system',
          title: e.action.replace(/_/g, ' ').replace(/^./, (s) => s.toUpperCase()),
          description: `${e.actor} → ${e.target}`,
          timestamp: e.timestamp,
        });
      }
      for (const a of alerts) {
        items.push({
          id: `alert-${a.id}`,
          kind: 'security',
          title: a.title,
          description: a.source,
          timestamp: a.createdAt,
          severity: a.severity as ActivityItem['severity'],
          status: a.status === 'RESOLVED' ? 'RESOLVED' : undefined,
        });
      }
    } else if (role === 'INSTITUTION' || role === 'ISSUER') {
      const creds = await getCredentials().catch(() => [] as Credential[]);
      const instCreds = institutionId ? creds.filter((c) => c.institutionId === institutionId) : creds;
      items.push(...credentialsToActivity(instCreds, 5));
      if (institutionId) {
        const audit = await getAuditLogs(institutionId).catch(() => []);
        for (const e of audit) {
          items.push({
            id: e.id,
            kind: 'system',
            title: e.action.replace(/_/g, ' ').replace(/^./, (s) => s.toUpperCase()),
            description: `${e.actor} → ${e.target}`,
            timestamp: e.timestamp,
          });
        }
      }
    } else if (role === 'EMPLOYER') {
      const history = await getVerificationHistory(userId).catch(() => []);
      for (const h of history) {
        items.push({
          id: h.id,
          kind: 'verification',
          title: h.credentialTitle,
          description: `Verified by ${h.verifiedBy} · ${h.method.replace(/_/g, ' ')}`,
          timestamp: h.verifiedAt,
          status: h.result,
        });
      }
    } else if (role === 'HOLDER') {
      const [creds, notifications] = await Promise.all([
        getHolderCredentials(userId).catch(() => []),
        fetchNotifications().catch(() => []),
      ]);
      items.push(...credentialsToActivity(creds, 4));
      for (const n of notifications.slice(0, 3)) {
        items.push({
          id: `notif-${n.id}`,
          kind: 'system',
          title: n.title,
          description: n.message,
          timestamp: n.createdAt,
          status: n.type === 'ERROR' ? 'INVALID' : n.type === 'WARNING' ? 'EXPIRED' : 'VALID',
        });
      }
    }
  } catch {
    return [];
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12);
}