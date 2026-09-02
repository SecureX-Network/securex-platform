import type { CredentialStatus, UserRole } from '@/types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
export const BLOCKCHAIN_API_URL = import.meta.env.VITE_BLOCKCHAIN_API_URL ?? 'http://localhost:4001/blockchain';
export const FRAUD_ENGINE_URL = import.meta.env.VITE_FRAUD_ENGINE_URL ?? 'http://localhost:4002/fraud';

export const IS_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const AUTH_TOKEN_KEY = 'securex_auth_token';
export const AUTH_USER_KEY = 'securex_auth_user';

export const MOCK_DELAY = 500;

export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  HOW_IT_WORKS: '/how-it-works',
  CONTACT: '/contact',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  MFA: '/auth/mfa',
  VERIFY: '/verify',
  VERIFY_CREDENTIAL: '/verify/:credentialId',
  HOLDER: '/holder',
  HOLDER_DASHBOARD: '/holder/dashboard',
  HOLDER_WALLET: '/holder/wallet',
  HOLDER_CREDENTIALS: '/holder/credentials',
  HOLDER_CREDENTIAL_DETAIL: '/holder/credentials/:id',
  HOLDER_SHARE: '/holder/share',
  HOLDER_NOTIFICATIONS: '/holder/notifications',
  HOLDER_SETTINGS: '/holder/settings',
  INSTITUTION: '/institution',
  INSTITUTION_DASHBOARD: '/institution/dashboard',
  INSTITUTION_CREDENTIALS: '/institution/credentials',
  INSTITUTION_ISSUERS: '/institution/issuers',
  INSTITUTION_ISSUE: '/institution/issue',
  INSTITUTION_TEMPLATES: '/institution/templates',
  INSTITUTION_ISSUER_DETAIL: '/institution/issuers/:id',
  EMPLOYER: '/employer',
  EMPLOYER_DASHBOARD: '/employer/dashboard',
  EMPLOYER_VERIFY: '/employer/verify',
  EMPLOYER_HISTORY: '/employer/history',
  EXPLORER: '/explorer',
  EXPLORER_BLOCKS: '/explorer/blocks',
  EXPLORER_BLOCK_DETAIL: '/explorer/blocks/:hash',
  EXPLORER_TRANSACTIONS: '/explorer/transactions',
  EXPLORER_TRANSACTION_DETAIL: '/explorer/transactions/:id',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_INSTITUTIONS: '/admin/institutions',
  ADMIN_ISSUERS: '/admin/issuers',
  ADMIN_USERS: '/admin/users',
  ADMIN_SECURITY: '/admin/security',
  ADMIN_SECURITY_ALERTS: '/admin/security/alerts',
  ADMIN_SECURITY_AUDIT: '/admin/security/audit',
  ADMIN_SETTINGS: '/admin/settings',
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
