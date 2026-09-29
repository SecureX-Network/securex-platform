import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// ROLE-AWARE LANDING ROUTE
//
// Single source of truth for "where does this role land after sign-in?".
// LoginPage, RegisterPage, MfaPage and the public entry page all route through
// this function, so the mapping is never duplicated.
//
// There is exactly ONE authenticated landing route, /home. The page it renders
// decides what the role actually sees — a holder's credentials, an issuer's
// issuance desk, an operator's platform overview — so the routing table cannot
// drift away from the surface the role is shown. Eight role-specific dashboard
// paths were the thing this replaced: they had grown into eight hand-maintained
// copies of essentially the same question.
//
// PUBLIC is not an authenticated role, so it stays on the public entry point.
//
// This is presentation routing only. It is not an authorization decision: the
// server enforces every role check independently.
// ---------------------------------------------------------------------------

export const ROLE_HOME: Record<UserRole, string> = {
  PUBLIC: '/',
  HOLDER: '/home',
  EMPLOYER: '/home',
  INSTITUTION: '/home',
  ISSUER: '/home',
  ADMIN: '/home',
  SECURITY_ADMIN: '/home',
  NETWORK_ADMIN: '/home',
  AUDITOR: '/home',
};

/** Human label for a role, used in greetings and administrative banners. */
export const ROLE_LABEL: Record<UserRole, string> = {
  PUBLIC: 'Guest',
  HOLDER: 'Credential Holder',
  EMPLOYER: 'Employer',
  INSTITUTION: 'Institution',
  ISSUER: 'Issuer',
  ADMIN: 'Administrator',
  SECURITY_ADMIN: 'Security Administrator',
  NETWORK_ADMIN: 'Network Administrator',
  AUDITOR: 'Auditor',
};

export function dashboardFor(role: UserRole): string {
  return ROLE_HOME[role] ?? '/';
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABEL[role] ?? role;
}
