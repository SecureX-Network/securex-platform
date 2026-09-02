import { IS_MOCK } from '@/constants';
import {
  MOCK_AUDIT_EVENTS,
  MOCK_CREDENTIALS,
  MOCK_INSTITUTIONS,
  MOCK_ISSUERS,
  mockDelay,
} from '@/services/mock';
import type { AuditEvent, Institution, Issuer } from '@/types';
import { fetchAPI, unwrapResponse } from './client';

export interface InstitutionStats {
  totalCredentials: number;
  activeCredentials: number;
  revokedCredentials: number;
  suspendedCredentials: number;
  expiredCredentials: number;
  totalIssuers: number;
  activeIssuers: number;
  credentialsIssuedThisMonth: number;
  verificationCount: number;
  avgVerificationTimeSec: number;
  recentActivity: { label: string; value: number; change: number }[];
}

const DAY = 86_400_000;

export async function getInstitutions(): Promise<Institution[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_INSTITUTIONS;
  }
  const response = await fetchAPI<Institution[]>('/institutions');
  return unwrapResponse(response);
}

export async function getInstitutionById(id: string): Promise<Institution> {
  if (IS_MOCK) {
    await mockDelay();
    const institution = MOCK_INSTITUTIONS.find((i) => i.id === id);
    if (!institution) {
      throw new Error(`Institution ${id} not found.`);
    }
    return institution;
  }
  const response = await fetchAPI<Institution>(`/institutions/${id}`);
  return unwrapResponse(response);
}

export async function getInstitutionStats(id: string): Promise<InstitutionStats> {
  if (IS_MOCK) {
    await mockDelay();
    const credentials = MOCK_CREDENTIALS.filter((c) => c.institutionId === id);
    const issuers = MOCK_ISSUERS.filter((i) => i.institutionId === id);
    const monthAgo = Date.now() - 30 * DAY;
    const issuedThisMonth = credentials.filter(
      (c) => new Date(c.issuedAt).getTime() > monthAgo,
    ).length;
    return {
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
        { label: 'New Issuers', value: issuers.filter((i) => new Date(i.createdAt).getTime() > monthAgo).length, change: -2 },
        { label: 'Revocations', value: credentials.filter((c) => c.status === 'REVOKED').length, change: 3 },
      ],
    };
  }
  const response = await fetchAPI<InstitutionStats>(`/institutions/${id}/stats`);
  return unwrapResponse(response);
}

export async function getIssuers(institutionId: string): Promise<Issuer[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_ISSUERS.filter((i) => i.institutionId === institutionId);
  }
  const response = await fetchAPI<Issuer[]>(
    `/institutions/${institutionId}/issuers`,
  );
  return unwrapResponse(response);
}

export async function getAuditLogs(institutionId: string): Promise<AuditEvent[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_AUDIT_EVENTS.filter(
      (event) => event.details?.includes(institutionId) ?? false,
    );
  }
  const response = await fetchAPI<AuditEvent[]>(
    `/institutions/${institutionId}/audit-logs`,
  );
  return unwrapResponse(response);
}