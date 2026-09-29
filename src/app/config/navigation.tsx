import {
  Activity,
  Ban,
  Building2,
  CreditCard,
  FileCheck2,
  FileCode,
  History,
  LayoutDashboard,
  Network,
  QrCode,
  ScanLine,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// SINGLE ROLE-AWARE NAVIGATION SOURCE
//
// This module is the ONLY place that decides what a role can see. The sidebar
// renders whatever `navigationFor(role)` returns; it holds no role logic of its
// own. Adding a destination means adding it here, never in a component.
//
// PRODUCT BOUNDARY (see docs/product-boundary.md)
//
//   'workspace'      end-user surfaces: credentials, verification, issuance,
//                    activity. Safe and useful for ordinary people.
//   'administration' operational surfaces: users, institutions, security
//                    operations, fraud investigation, audit, network/blocks.
//
// The deep operational tooling conceptually belongs to the separate Control
// Center (control-securex.sp-net.in). The routes are preserved here because
// internal roles still use them, but they are gated to operator roles and the
// sidebar marks them as an administrative area so an operator is never misled
// about which product they are in.
//
// Frontend navigation is a UX affordance only. It is never an authorization
// decision: the server re-checks every role on every request.
// ---------------------------------------------------------------------------

export type NavAudience = 'workspace' | 'administration';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
  end?: boolean;
  badge?: string;
  /** Renders as an outbound link instead of a router navigation. */
  external?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  audience: NavAudience;
  items: NavItem[];
}

/** Roles that represent an ordinary person or organisation using credentials. */
export const END_USER_ROLES: UserRole[] = ['HOLDER', 'EMPLOYER', 'INSTITUTION', 'ISSUER'];

/** Roles that operate the platform itself. These see the administration area. */
export const OPERATOR_ROLES: UserRole[] = ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR'];

const EVERYONE: UserRole[] = [...END_USER_ROLES, ...OPERATOR_ROLES];

const INSTITUTION_ROLES: UserRole[] = ['INSTITUTION', 'ISSUER'];

/** Roles allowed to perform in-app verification of a credential they were given. */
export const VERIFY_ROLES: UserRole[] = ['HOLDER', 'EMPLOYER', 'INSTITUTION', 'ISSUER'];

/** Roles allowed to see the administrative/operational surfaces. */
const OPERATIONS_ROLES: UserRole[] = OPERATOR_ROLES;

/** Where deep operational tooling now lives. */
export const CONTROL_CENTER_URL = 'https://control-securex.sp-net.in';

export function isOperatorRole(role: UserRole): boolean {
  return OPERATOR_ROLES.includes(role);
}

export function isEndUserRole(role: UserRole): boolean {
  return END_USER_ROLES.includes(role);
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    label: 'Home',
    audience: 'workspace',
    items: [
      {
        label: 'Home',
        path: '/home',
        icon: LayoutDashboard,
        // Every role lands on the same /home and is then shown the surface
        // their role is responsible for, so there is one entry point instead of
        // eight role-specific dashboards.
        roles: EVERYONE,
        end: true,
      },
    ],
  },
  {
    id: 'credentials',
    label: 'Credentials',
    audience: 'workspace',
    items: [
      {
        label: 'My Credentials',
        path: '/credentials',
        icon: CreditCard,
        roles: ['HOLDER'],
        end: true,
      },
      {
        label: 'Wallet',
        path: '/wallet',
        icon: Wallet,
        roles: ['HOLDER'],
        end: true,
      },
      {
        label: 'Share & QR',
        path: '/share',
        icon: QrCode,
        roles: ['HOLDER'],
        end: true,
      },
      {
        label: 'Credentials',
        path: '/institution/credentials',
        icon: CreditCard,
        roles: INSTITUTION_ROLES,
        end: true,
      },
      {
        label: 'Holders',
        path: '/institution/holders',
        icon: Users,
        roles: INSTITUTION_ROLES,
        end: true,
      },
    ],
  },
  {
    id: 'issue',
    label: 'Issue',
    audience: 'workspace',
    items: [
      {
        label: 'Issue Credential',
        path: '/institution/issue',
        icon: FileCode,
        roles: INSTITUTION_ROLES,
        end: true,
      },
      {
        label: 'Issuers',
        path: '/institution/issuers',
        icon: FileCheck2,
        roles: INSTITUTION_ROLES,
        end: true,
      },
      {
        label: 'Templates',
        path: '/institution/templates',
        icon: FileCode,
        roles: INSTITUTION_ROLES,
        end: true,
      },
    ],
  },
  {
    id: 'verify',
    label: 'Verify',
    audience: 'workspace',
    items: [
      {
        // The public verifier. It needs no account, so it is a genuinely
        // different destination from the in-shell flow below — it is what you
        // hand to someone who will not sign in.
        label: 'Verify',
        path: '/verify',
        icon: QrCode,
        roles: VERIFY_ROLES,
        end: true,
      },
      {
        // The in-shell verification workspace. Runs the same platform check and
        // records the outcome in this role's verification history.
        label: 'Verify Credential',
        path: '/verify-credential',
        icon: ScanLine,
        roles: VERIFY_ROLES,
        end: true,
      },
      {
        label: 'Verification History',
        path: '/verification-history',
        icon: History,
        roles: VERIFY_ROLES,
        end: true,
      },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    audience: 'workspace',
    items: [
      {
        label: 'Activity',
        path: '/activity',
        icon: Activity,
        roles: EVERYONE,
        end: true,
      },
      {
        label: 'Notifications',
        path: '/notifications',
        icon: ScrollText,
        roles: EVERYONE,
        end: true,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    audience: 'workspace',
    items: [
      {
        label: 'Settings',
        path: '/account/settings',
        icon: Settings,
        roles: EVERYONE,
        end: true,
      },
    ],
  },

  {
    // Public read-only ledger data. It is reachable by every role, but it is
    // deliberately a single, last-placed entry: operational infrastructure is
    // not a daily destination for someone holding or issuing credentials, and
    // giving it a four-item section in the middle of the sidebar read as though
    // it were. The deeper pages (/explorer/blocks, /validators, /network) stay
    // routable from the explorer itself and from the Control Center.
    id: 'network',
    label: 'Ledger',
    audience: 'workspace',
    items: [
      {
        label: 'Block Explorer',
        path: '/explorer',
        icon: Network,
        roles: EVERYONE,
        end: true,
      },
    ],
  },
  // ── Administration ────────────────────────────────────────────────────
  // Operator-only. Deliberately separated from the workspace sections above
  // so ordinary roles never see a hint of internal tooling.
  {
    id: 'security',
    label: 'Security',
    audience: 'administration',
    items: [
      {
        label: 'Security Center',
        path: '/security',
        icon: ShieldCheck,
        roles: OPERATIONS_ROLES,
        end: true,
      },
      {
        label: 'Security Alerts',
        path: '/security/alerts',
        icon: ShieldAlert,
        roles: OPERATIONS_ROLES,
      },
      {
        label: 'Security Events',
        path: '/security/events',
        icon: Activity,
        roles: OPERATIONS_ROLES,
      },
      {
        label: 'Fraud & Tampering',
        path: '/fraud',
        icon: ShieldAlert,
        roles: OPERATIONS_ROLES,
        end: true,
      },
      {
        label: 'Audit Log',
        path: '/admin/security/audit',
        icon: ScrollText,
        roles: ['ADMIN', 'AUDITOR'],
        end: true,
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    audience: 'administration',
    items: [
      {
        label: 'Platform Overview',
        path: '/admin',
        icon: LayoutDashboard,
        roles: OPERATIONS_ROLES,
        end: true,
      },
      {
        label: 'Users',
        path: '/admin/users',
        icon: UserCog,
        roles: ['ADMIN', 'SECURITY_ADMIN'],
      },
      {
        label: 'Institutions',
        path: '/admin/institutions',
        icon: Building2,
        roles: ['ADMIN', 'NETWORK_ADMIN'],
      },
      {
        label: 'Issuers',
        path: '/admin/issuers',
        icon: Ban,
        roles: ['ADMIN', 'NETWORK_ADMIN'],
      },
    ],
  },
  {
    id: 'control-center',
    label: 'Control Center',
    audience: 'administration',
    items: [
      {
        label: 'Open Control Center',
        path: CONTROL_CENTER_URL,
        icon: ExternalLink,
        roles: OPERATIONS_ROLES,
        external: true,
      },
    ],
  },
];

/** Ordered navigation sections visible to a role. */
export function navigationFor(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}

/** Every path a role is allowed to reach through navigation. */
export function pathsFor(role: UserRole): string[] {
  return navigationFor(role)
    .flatMap((section) => section.items)
    .map((item) => item.path);
}

/** True when this role's navigation includes any administrative surface. */
export function hasAdministrationSurface(role: UserRole): boolean {
  return navigationFor(role).some((section) => section.audience === 'administration');
}

export function sectionForPath(pathname: string): { section?: string; label?: string } {
  let best: { section: string; label: string; length: number } | null = null;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.external) continue;
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        const length = item.path.length;
        if (!best || length > best.length) {
          best = { section: section.label, label: item.label, length };
        }
      }
    }
  }
  if (!best) return {};
  return best.section === best.label
    ? { section: best.section }
    : { section: best.section, label: best.label };
}
