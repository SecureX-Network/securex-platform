import type { CredentialStatus, UserRole } from '@/types';
import { config } from '@/config';

// ---------------------------------------------------------------------------
// Re-exported from the single authoritative config source (src/config/index.ts).
// Nothing here reads `import.meta.env` directly — see that file for the
// fail-closed DEMO-mode rules and the "no blockchain URL / no blockchain secret
// in the browser" rule.
//
// NOTE: there is intentionally NO `BLOCKCHAIN_API_URL` export any more. The
// browser must not address the privileged blockchain service directly; all
// chain operations are proxied by the Platform API (server/routes/blockchain.ts
// -> server/services/blockchain.ts).
// ---------------------------------------------------------------------------

export const API_BASE_URL = config.API_URL;

/**
 * True only when DEMO mode was EXPLICITLY requested via
 * `VITE_USE_MOCK=true`. Undefined resolves to REAL mode (fail closed).
 */
export const IS_MOCK = config.IS_MOCK;

export const APP_NAME = config.APP_NAME;
export const APP_VERSION = config.APP_VERSION;

export const AUTH_TOKEN_KEY = 'securex_auth_token';
export const AUTH_USER_KEY = 'securex_auth_user';

export const MOCK_DELAY = 500;

export const ROUTES = {
  HOME: '/',
  APP_HOME: '/home',
  ACTIVITY: '/activity',
  ABOUT: '/about',
  HOW_IT_WORKS: '/how-it-works',
  CONTACT: '/contact',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  MFA: '/auth/mfa',
  VERIFY: '/verify',
  VERIFY_CREDENTIAL: '/verify/:credentialId',
  /**
   * Canonical end-user paths. The `/holder/*` and `/employer/*` URLs are kept
   * only as redirects in AppRoutes — never link to them, so the address bar
   * never shows a legacy path.
   */
  HOLDER: '/home',
  HOLDER_DASHBOARD: '/home',
  HOLDER_WALLET: '/wallet',
  HOLDER_CREDENTIALS: '/credentials',
  HOLDER_CREDENTIAL_DETAIL: '/credentials/:id',
  HOLDER_SHARE: '/share',
  HOLDER_VERIFY_CREDENTIAL: '/verify-credential',
  HOLDER_NOTIFICATIONS: '/notifications',
  HOLDER_SETTINGS: '/account/settings',
  INSTITUTION: '/institution',
  INSTITUTION_DASHBOARD: '/home',
  INSTITUTION_CREDENTIALS: '/institution/credentials',
  INSTITUTION_HOLDERS: '/institution/holders',
  INSTITUTION_ISSUERS: '/institution/issuers',
  INSTITUTION_ISSUE: '/institution/issue',
  INSTITUTION_TEMPLATES: '/institution/templates',
  INSTITUTION_ISSUER_DETAIL: '/institution/issuers/:id',
  EMPLOYER: '/home',
  EMPLOYER_DASHBOARD: '/home',
  EMPLOYER_VERIFY: '/verify-credential',
  EMPLOYER_HISTORY: '/verification-history',
  EXPLORER: '/explorer',
  EXPLORER_BLOCKS: '/explorer/blocks',
  EXPLORER_BLOCK_DETAIL: '/explorer/blocks/:hash',
  EXPLORER_TRANSACTIONS: '/explorer/transactions',
  EXPLORER_TRANSACTION_DETAIL: '/explorer/transactions/:id',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/home',
  ADMIN_INSTITUTIONS: '/admin/institutions',
  ADMIN_ISSUERS: '/admin/issuers',
  ADMIN_USERS: '/admin/users',
  ADMIN_SECURITY: '/admin/security',
  ADMIN_SECURITY_ALERTS: '/admin/security/alerts',
  ADMIN_SECURITY_AUDIT: '/admin/security/audit',
  ADMIN_SETTINGS: '/account/settings',
  SECURITY: '/security',
  SECURITY_OVERVIEW: '/security',
  SECURITY_ALERTS: '/security/alerts',
  SECURITY_EVENTS: '/security/events',
  SECURITY_STATUS: '/security/settings',
  NOT_FOUND: '*',
} as const;

export interface NavigationItem {
  label: string;
  path: string;
  roles: UserRole[];
}

export const NAVIGATION: Record<string, NavigationItem[]> = {
  public: [
    { label: 'Home', path: ROUTES.HOME, roles: ['PUBLIC', 'HOLDER', 'INSTITUTION', 'ISSUER', 'EMPLOYER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Verify', path: ROUTES.VERIFY, roles: ['PUBLIC', 'HOLDER', 'INSTITUTION', 'ISSUER', 'EMPLOYER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Explorer', path: ROUTES.EXPLORER, roles: ['PUBLIC', 'HOLDER', 'INSTITUTION', 'ISSUER', 'EMPLOYER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Login', path: ROUTES.LOGIN, roles: ['PUBLIC'] },
  ],
  holder: [
    { label: 'Dashboard', path: ROUTES.HOLDER_DASHBOARD, roles: ['HOLDER'] },
    { label: 'My Credentials', path: ROUTES.HOLDER_CREDENTIALS, roles: ['HOLDER'] },
    { label: 'Share Credential', path: ROUTES.HOLDER_SHARE, roles: ['HOLDER'] },
  ],
  institution: [
    { label: 'Dashboard', path: ROUTES.INSTITUTION_DASHBOARD, roles: ['INSTITUTION'] },
    { label: 'Credentials', path: ROUTES.INSTITUTION_CREDENTIALS, roles: ['INSTITUTION'] },
    { label: 'Issuers', path: ROUTES.INSTITUTION_ISSUERS, roles: ['INSTITUTION'] },
    { label: 'Issue New', path: ROUTES.INSTITUTION_ISSUE, roles: ['INSTITUTION'] },
    { label: 'Templates', path: ROUTES.INSTITUTION_TEMPLATES, roles: ['INSTITUTION'] },
  ],
  employer: [
    { label: 'Dashboard', path: ROUTES.EMPLOYER_DASHBOARD, roles: ['EMPLOYER'] },
    { label: 'Verify Credential', path: ROUTES.EMPLOYER_VERIFY, roles: ['EMPLOYER'] },
    { label: 'Verification History', path: ROUTES.EMPLOYER_HISTORY, roles: ['EMPLOYER'] },
  ],
  explorer: [
    { label: 'Overview', path: ROUTES.EXPLORER, roles: ['PUBLIC', 'HOLDER', 'INSTITUTION', 'ISSUER', 'EMPLOYER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Blocks', path: ROUTES.EXPLORER_BLOCKS, roles: ['PUBLIC', 'HOLDER', 'INSTITUTION', 'ISSUER', 'EMPLOYER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Transactions', path: ROUTES.EXPLORER_TRANSACTIONS, roles: ['PUBLIC', 'HOLDER', 'INSTITUTION', 'ISSUER', 'EMPLOYER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
  ],
  admin: [
    { label: 'Dashboard', path: ROUTES.ADMIN_DASHBOARD, roles: ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Institutions', path: ROUTES.ADMIN_INSTITUTIONS, roles: ['ADMIN', 'NETWORK_ADMIN'] },
    { label: 'Issuers', path: ROUTES.ADMIN_ISSUERS, roles: ['ADMIN', 'NETWORK_ADMIN'] },
    { label: 'Users', path: ROUTES.ADMIN_USERS, roles: ['ADMIN', 'SECURITY_ADMIN'] },
    { label: 'Security', path: ROUTES.ADMIN_SECURITY, roles: ['ADMIN', 'SECURITY_ADMIN'] },
    { label: 'Audit Log', path: ROUTES.ADMIN_SECURITY_AUDIT, roles: ['ADMIN', 'AUDITOR'] },
  ],
  security: [
    { label: 'Overview', path: ROUTES.SECURITY_OVERVIEW, roles: ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Alerts', path: ROUTES.SECURITY_ALERTS, roles: ['ADMIN', 'SECURITY_ADMIN', 'AUDITOR'] },
    { label: 'Events', path: ROUTES.SECURITY_EVENTS, roles: ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
    { label: 'Status', path: ROUTES.SECURITY_STATUS, roles: ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'] },
  ],
};

const statusColorMap: Record<CredentialStatus, string> = {
  VALID: 'bg-green-100 text-green-800 border-green-200',
  INVALID: 'bg-red-100 text-red-800 border-red-200',
  REVOKED: 'bg-red-100 text-red-800 border-red-200',
  SUSPENDED: 'bg-amber-100 text-amber-800 border-amber-200',
  EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200',
  TAMPERED: 'bg-red-100 text-red-800 border-red-200',
  SUSPICIOUS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  NOT_FOUND: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const STATUS_COLORS: Record<CredentialStatus, string> = statusColorMap;

const ROLES_MAP = {
  PUBLIC: 'Public User',
  HOLDER: 'Credential Holder',
  INSTITUTION: 'Institution',
  ISSUER: 'Issuer',
  EMPLOYER: 'Employer',
  ADMIN: 'Administrator',
  SECURITY_ADMIN: 'Security Admin',
  NETWORK_ADMIN: 'Network Admin',
  AUDITOR: 'Auditor',
} as const;

export const ROLES = ROLES_MAP;
