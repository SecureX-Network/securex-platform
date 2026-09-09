export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityEventAction =
  | 'USER_LOGIN'
  | 'USER_LOGIN_FAILED'
  | 'USER_LOGOUT'
  | 'CREDENTIAL_ISSUED'
  | 'CREDENTIAL_VERIFIED'
  | 'CREDENTIAL_REVOKED'
  | 'CREDENTIAL_SUSPENDED'
  | 'TAMPER_DETECTED'
  | 'FRAUD_DETECTED'
  | 'SECURITY_ALERT_CREATED'
  | 'SECURITY_ALERT_ACKNOWLEDGED'
  | 'SECURITY_CONFIG_CHANGED'
  | 'INSTITUTION_REGISTERED'
  | 'ISSUER_STATUS_CHANGED'
  | 'BRUTE_FORCE_BLOCKED'
  | 'UNAUTHORIZED_ACCESS_BLOCKED'
  | 'SESSION_EXPIRED'
  | 'MFA_CHALLENGE'
  | 'ROLE_CHANGED';

export type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'UNKNOWN';

export interface SecurityOverviewData {
  securityScore: number;
  overallStatus: 'STRONG' | 'MODERATE' | 'NEEDS_ATTENTION';
  activeAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  suspiciousEvents24h: number;
  credentialsMonitored: number;
  verificationsToday: number;
  lastUpdated: string;
}

export interface SecurityServiceHealth {
  name: string;
  status: ServiceStatus;
  lastChecked: string;
  responseTimeMs?: number;
  description: string;
}

export interface SecuritySession {
  sessionId: string;
  user: string;
  role: string;
  ipAddress: string;
  device: string;
  location: string;
  startedAt: string;
  lastActivityAt: string;
  isActive: boolean;
}

export interface CredentialIntegrityStats {
  total: number;
  valid: number;
  revoked: number;
  expired: number;
  tampered: number;
  suspicious: number;
}

export interface SecurityActivityItem {
  id: string;
  action: SecurityEventAction;
  actor: string;
  actorRole: string;
  target: string;
  targetType: string;
  details?: string;
  ipAddress: string;
  timestamp: string;
  severity: SecuritySeverity;
}
