import { IS_MOCK } from '@/constants';
import {
  MOCK_AUDIT_EVENTS,
  MOCK_CREDENTIALS,
  MOCK_INSTITUTIONS,
  MOCK_RISK_ASSESSMENTS,
  MOCK_SECURITY_ALERTS,
  MOCK_TRANSACTIONS,
  MOCK_USERS,
  MOCK_VERIFICATION_HISTORY,
  mockDelay,
} from '@/services/mock';
import type {
  AuditEvent,
  Institution,
  RiskAssessment,
  SecurityAlert,
  User,
} from '@/types';
import { fetchAPI, unwrapResponse } from './client';

export interface AdminStats {
  totalUsers: number;
  totalInstitutions: number;
  totalCredentials: number;
  totalVerifications: number;
  activeAlerts: number;
  totalTransactions: number;
  dailyActiveUsers: number;
  registeredThisMonth: { label: string; value: number }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  if (IS_MOCK) {
    await mockDelay();
    return {
      totalUsers: MOCK_USERS.length,
      totalInstitutions: MOCK_INSTITUTIONS.length,
      totalCredentials: MOCK_CREDENTIALS.length,
      totalVerifications: MOCK_VERIFICATION_HISTORY.length,
      activeAlerts: MOCK_SECURITY_ALERTS.filter(
        (a) => a.status === 'NEW' || a.status === 'ACKNOWLEDGED' || a.status === 'INVESTIGATING',
      ).length,
      totalTransactions: MOCK_TRANSACTIONS.length,
      dailyActiveUsers: 184,
      registeredThisMonth: [
        { label: 'Holders', value: 312 },
        { label: 'Employers', value: 87 },
        { label: 'Institutions', value: 9 },
        { label: 'Issuers', value: 214 },
      ],
    };
  }
  const response = await fetchAPI<AdminStats>('/admin/stats');
  return unwrapResponse(response);
}

export async function getAllInstitutions(): Promise<Institution[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_INSTITUTIONS;
  }
  const response = await fetchAPI<Institution[]>('/admin/institutions');
  return unwrapResponse(response);
}

export async function getAllUsers(): Promise<User[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_USERS.map(({ password: _pw, ...user }) => user);
  }
  const response = await fetchAPI<User[]>('/admin/users');
  return unwrapResponse(response);
}

export async function getSecurityAlerts(): Promise<SecurityAlert[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_SECURITY_ALERTS;
  }
  const response = await fetchAPI<SecurityAlert[]>('/admin/security/alerts');
  return unwrapResponse(response);
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_AUDIT_EVENTS;
  }
  const response = await fetchAPI<AuditEvent[]>('/admin/security/audit');
  return unwrapResponse(response);
}

export async function getFraudAlerts(): Promise<RiskAssessment[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_RISK_ASSESSMENTS;
  }
  const response = await fetchAPI<RiskAssessment[]>('/admin/security/fraud');
  return unwrapResponse(response);
}