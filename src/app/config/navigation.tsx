import {
  Activity,
  Blocks,
  Building2,
  CreditCard,
  FileCode,
  History,
  LayoutDashboard,
  Network,
  QrCode,
  ScrollText,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types';
import { dashboardFor } from '@/app/config/roleRouting';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
  end?: boolean;
  badge?: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const EVERYONE: UserRole[] = [
  'HOLDER',
  'INSTITUTION',
  'ISSUER',
  'EMPLOYER',
  'ADMIN',
  'SECURITY_ADMIN',
  'NETWORK_ADMIN',
  'AUDITOR',
];

const INSTITUTION_ROLES: UserRole[] = ['INSTITUTION', 'ISSUER'];

const SECURITY_ROLES: UserRole[] = [
  'ADMIN',
  'SECURITY_ADMIN',
  'NETWORK_ADMIN',
  'AUDITOR',
];

const NETWORK_ROLES: UserRole[] = [
  'INSTITUTION',
  'ISSUER',
  'ADMIN',
  'SECURITY_ADMIN',
  'NETWORK_ADMIN',
  'AUDITOR',
];

const SYSTEM_SECTIONS: NavSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        label: 'Overview',
        path: '/',
        icon: LayoutDashboard,
        roles: EVERYONE,
        end: false,
      },
      {
        label: 'My Wallet',
        path: '/holder/wallet',
        icon: Wallet,
        roles: ['HOLDER'],
        end: true,
      },
      {
        label: 'My Credentials',
        path: '/holder/credentials',
        icon: CreditCard,
        roles: ['HOLDER'],
      },
      {
        label: 'Credentials',
        path: '/institution/credentials',
        icon: CreditCard,
        roles: INSTITUTION_ROLES,
      },
      {
        label: 'Verification History',
        path: '/employer/history',
        icon: History,
        roles: ['EMPLOYER'],
      },
    ],
  },
  {
    id: 'trust',
    label: 'Trust',
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
        icon: Users,
        roles: INSTITUTION_ROLES,
      },
      {
        label: 'Templates',
        path: '/institution/templates',
        icon: FileCode,
        roles: INSTITUTION_ROLES,
      },
      {
        label: 'Share Credential',
        path: '/holder/share',
        icon: Share2,
        roles: ['HOLDER'],
        end: true,
      },
      {
        label: 'Verify Credential',
        path: '/employer/verify',
        icon: QrCode,
        roles: ['EMPLOYER'],
        end: true,
      },
      {
        label: 'Verify',
        path: '/verify',
        icon: QrCode,
        roles: ['HOLDER', 'EMPLOYER'],
        end: true,
      },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    items: [
      {
        label: 'Explorer',
        path: '/explorer',
        icon: Network,
        roles: EVERYONE,
        end: true,
      },
      {
        label: 'Blocks',
        path: '/explorer/blocks',
        icon: Blocks,
        roles: NETWORK_ROLES,
      },
      {
        label: 'Transactions',
        path: '/explorer/transactions',
        icon: Activity,
        roles: NETWORK_ROLES,
      },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    items: [
      {
        label: 'Security Center',
        path: '/security',
        icon: ShieldCheck,
        roles: SECURITY_ROLES,
        end: true,
      },
      {
        label: 'Security Alerts',
        path: '/security/alerts',
        icon: ShieldAlert,
        roles: SECURITY_ROLES,
      },
      {
        label: 'Events',
        path: '/security/events',
        icon: Activity,
        roles: SECURITY_ROLES,
      },
      {
        label: 'Fraud & Tampering',
        path: '/fraud',
        icon: ShieldAlert,
        roles: SECURITY_ROLES,
        end: true,
      },
      {
        label: 'Audit Log',
        path: '/admin/security/audit',
        icon: ScrollText,
        roles: ['ADMIN', 'AUDITOR'],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
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
        icon: Users,
        roles: ['ADMIN', 'NETWORK_ADMIN'],
      },
      {
        label: 'Notifications',
        path: '/notifications',
        icon: Activity,
        roles: EVERYONE,
        end: true,
      },
      {
        label: 'Settings',
        path: '/account/settings',
        icon: Settings,
        roles: EVERYONE,
        end: true,
      },
    ],
  },
];

export function navigationFor(role: UserRole): NavSection[] {
  const overviewPath = dashboardFor(role);

  const sections = SYSTEM_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .map((item) =>
        item.label === 'Overview'
          ? { ...item, path: overviewPath, end: dashboardForEndsAt(overviewPath) }
          : item,
      )
      .filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  return sections;
}

function dashboardForEndsAt(path: string): boolean {
  return path === '/admin/dashboard' || path === '/employer/dashboard';
}

export function sectionForPath(pathname: string): { section?: string; label?: string } {
  let best: { section: string; label: string; length: number } | null = null;
  for (const section of SYSTEM_SECTIONS) {
    for (const item of section.items) {
      if (item.label === 'Overview') continue;
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        const length = item.path.length;
        if (!best || length > best.length) {
          best = { section: section.label, label: item.label, length };
        }
      }
    }
  }
  return best ? { section: best.section, label: best.label } : {};
}