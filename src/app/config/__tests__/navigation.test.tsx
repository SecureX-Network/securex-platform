import { describe, expect, it } from 'vitest';
import { navigationFor, sectionForPath } from '@/app/config/navigation';
import type { UserRole } from '@/types';

describe('navigationFor', () => {
  it('routes every role to Home at /home', () => {
    const roles: UserRole[] = [
      'HOLDER',
      'INSTITUTION',
      'ISSUER',
      'EMPLOYER',
      'ADMIN',
      'SECURITY_ADMIN',
      'NETWORK_ADMIN',
      'AUDITOR',
    ];
    for (const role of roles) {
      const sections = navigationFor(role);
      const items = sections.flatMap((s) => s.items);
      expect(items.some((i) => i.label === 'Home' && i.path === '/home')).toBe(true);
    }
  });

  it('gives the HOLDER a credential-wallet-centric workspace', () => {
    const sections = navigationFor('HOLDER');
    const labels = sections.map((s) => s.label);
    // The ledger entry is deliberately last: infrastructure is reachable but is
    // not presented as a daily destination alongside credentials and verification.
    expect(labels).toEqual(['Home', 'Credentials', 'Verify', 'Activity', 'Settings', 'Ledger']);
    const items = sections.flatMap((s) => s.items).map((i) => i.label);
    expect(items).toContain('Wallet');
    expect(items).toContain('My Credentials');
    expect(items).toContain('Verify');
    expect(items).toContain('Notifications');
    expect(items).toContain('Settings');
  });

  it('does not lead the end-user nav with infrastructure', () => {
    for (const role of ['HOLDER', 'EMPLOYER', 'INSTITUTION', 'ISSUER'] as const) {
      const sections = navigationFor(role);
      const ledger = sections.findIndex((s) => s.id === 'network');
      // Ledger is present but last among the workspace sections.
      expect(ledger).toBe(sections.length - 1);
      const ledgerItems = sections[ledger]?.items ?? [];
      expect(ledgerItems).toHaveLength(1);
      expect(ledgerItems[0]?.path).toBe('/explorer');
      // The sub-pages stay routable but are not given sidebar prominence.
      for (const role2 of ['HOLDER', 'EMPLOYER'] as const) {
        const paths = navigationFor(role2).flatMap((s) => s.items.map((i) => i.path));
        expect(paths).not.toContain('/explorer/validators');
        expect(paths).not.toContain('/explorer/network');
      }
    }
  });

  it('does not expose institution, issuer, or operator surface to a HOLDER', () => {
    const paths = navigationFor('HOLDER').flatMap((s) => s.items.map((i) => i.path));
    expect(paths).not.toContain('/institution/issue');
    expect(paths).not.toContain('/admin/users');
    expect(paths).not.toContain('/security');
    expect(paths).not.toContain('/fraud');
  });

  it('gives an institution an issue-first workspace without operator surface', () => {
    const sections = navigationFor('INSTITUTION');
    const labels = sections.flatMap((s) => s.items.map((i) => i.label));
    const groupLabels = sections.map((s) => s.label);
    expect(groupLabels).toContain('Issue');
    expect(labels).toContain('Issue Credential');
    expect(labels).toContain('Templates');
    expect(labels).toContain('Credentials');
    expect(labels).not.toContain('Users');
    expect(labels).not.toContain('Security Center');
    const paths = sections.flatMap((s) => s.items.map((i) => i.path));
    expect(paths).not.toContain('/admin/institutions');
  });

  it('keeps the employer verification-first', () => {
    const sections = navigationFor('EMPLOYER');
    const labels = sections.flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toContain('Verify Credential');
    expect(labels).toContain('Verification History');
    expect(labels).toContain('Verify');
    const paths = sections.flatMap((s) => s.items.map((i) => i.path));
    expect(paths).not.toContain('/institution/issue');
    expect(paths).not.toContain('/admin/users');
  });

  it('gives operators a security and administration surface scoped by permission', () => {
    const adminSections = navigationFor('ADMIN');
    const adminLabels = adminSections.flatMap((s) => s.items.map((i) => i.label));
    expect(adminLabels).toContain('Security Center');
    expect(adminLabels).toContain('Fraud & Tampering');
    expect(adminLabels).toContain('Audit Log');
    expect(adminLabels).toContain('Users');
    expect(adminLabels).toContain('Institutions');

    const auditorSections = navigationFor('AUDITOR');
    const auditorPaths = auditorSections.flatMap((s) => s.items.map((i) => i.path));
    expect(auditorPaths).toContain('/admin/security/audit');
    expect(auditorPaths).toContain('/security');
    expect(auditorPaths).not.toContain('/admin/users');
  });

  it('keeps every nav item pointing at a location that role may access', () => {
    // The canonical workspace URLs are short and public-facing (/credentials,
    // /verify-credential, /verification-history) so they can be shown on
    // screen and shared; /holder/* and /employer/* are legacy redirects into
    // them. These prefixes are therefore the canonical surfaces, not the legacy
    // ones. External items are skipped: they leave the app for the Control
    // Center, so no in-app route guards them.
    const roleGroups: Array<[UserRole, string[]]> = [
      [
        'HOLDER',
        [
          '/home',
          '/credentials',
          '/wallet',
          '/share',
          '/verify',
          '/verification-history',
          '/explorer',
          '/activity',
          '/notifications',
          '/account',
        ],
      ],
      [
        'INSTITUTION',
        [
          '/home',
          '/institution',
          '/verify',
          '/verification-history',
          '/explorer',
          '/activity',
          '/notifications',
          '/account',
        ],
      ],
      [
        'EMPLOYER',
        [
          '/home',
          '/verify',
          '/verification-history',
          '/explorer',
          '/activity',
          '/notifications',
          '/account',
        ],
      ],
      ['ADMIN', ['/home', '/admin', '/security', '/fraud', '/explorer', '/activity', '/notifications', '/account']],
    ];
    for (const [role, allowedPrefixes] of roleGroups) {
      for (const item of navigationFor(role).flatMap((s) => s.items)) {
        if (item.external) continue;
        const ok = allowedPrefixes.some((prefix) => item.path.startsWith(prefix));
        expect(ok, `${role} item ${item.path} must be relevant to that role`).toBe(true);
      }
    }
  });
});

describe('sectionForPath', () => {
  it('resolves a section and label for a known path', () => {
    expect(sectionForPath('/home')).toEqual({ section: 'Home' });
    expect(sectionForPath('/wallet')).toEqual({ section: 'Credentials', label: 'Wallet' });
    expect(sectionForPath('/institution/issue')).toEqual({ section: 'Issue', label: 'Issue Credential' });
    expect(sectionForPath('/security/alerts')).toEqual({ section: 'Security', label: 'Security Alerts' });
    expect(sectionForPath('/activity')).toEqual({ section: 'Activity' });
  });

  it('returns an empty context for unknown paths', () => {
    expect(sectionForPath('/nonsense/xyz')).toEqual({});
  });
});