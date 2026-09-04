import type { SecurityAlert, Institution, Issuer, UserRole } from '@/types';

export const severityBadgeVariant: Record<SecurityAlert['severity'], 'danger' | 'warning' | 'info'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'warning',
  LOW: 'info',
};

export const alertStatusBadgeVariant: Record<SecurityAlert['status'], 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  NEW: 'danger',
  ACKNOWLEDGED: 'warning',
  INVESTIGATING: 'info',
  RESOLVED: 'success',
  DISMISSED: 'default',
};

export const institutionStatusBadgeVariant: Record<Institution['status'], 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  PENDING: 'warning',
};

export const issuerStatusBadgeVariant: Record<Issuer['status'], 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  REVOKED: 'danger',
};

export const roleBadgeVariant: Record<UserRole, 'default' | 'success' | 'info' | 'purple' | 'warning' | 'danger'> = {
  PUBLIC: 'default',
  HOLDER: 'success',
  INSTITUTION: 'info',
  ISSUER: 'purple',
  EMPLOYER: 'warning',
  ADMIN: 'danger',
  SECURITY_ADMIN: 'danger',
  NETWORK_ADMIN: 'danger',
  AUDITOR: 'warning',
};

export const severityStyles: Record<string, string> = {
  CRITICAL: 'bg-danger-50 text-danger-700 ring-danger-600/20',
  HIGH: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  MEDIUM: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  LOW: 'bg-securex-50 text-securex-700 ring-securex-600/20',
};
