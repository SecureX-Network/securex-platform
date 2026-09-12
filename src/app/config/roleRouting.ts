import type { UserRole } from '@/types';

export function dashboardFor(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
    case 'SECURITY_ADMIN':
    case 'NETWORK_ADMIN':
    case 'AUDITOR':
      return '/admin/dashboard';
    case 'INSTITUTION':
    case 'ISSUER':
      return '/institution/dashboard';
    case 'EMPLOYER':
      return '/employer/dashboard';
    case 'HOLDER':
      return '/holder/dashboard';
    default:
      return '/';
  }
}