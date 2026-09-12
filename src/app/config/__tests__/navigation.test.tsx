import { describe, expect, it } from 'vitest';
import { navigationFor, sectionForPath } from '@/app/config/navigation';
import type { UserRole } from '@/types';

describe('navigationFor', () => {
  it('routes every role to an Overview with their dashboard path', () => {
    const cases: Array<{ role: UserRole; path: string }> = [
      { role: 'HOLDER', path: '/holder/dashboard' },
      { role: 'INSTITUTION', path: '/institution/dashboard' },
      { role: 'ISSUER', path: '/institution/dashboard' },
      { role: 'EMPLOYER', path: '/employer/dashboard' },
      { role: 'ADMIN', path: '/admin/dashboard' },
      { role: 'SECURITY_ADMIN', path: '/admin/dashboard' },
      { role: 'NETWORK_ADMIN', path: '/admin/dashboard' },
      { role: 'AUDITOR', path: '/admin/dashboard' },
    ];
    for (const { role, path } of cases) {
      const sections = navigationFor(role);
      const items = sections.flatMap((s) => s.items);
      const overview = items.find((i) => i.label === 'Overview');
      expect(overview?.path).toBe(path);
    }
  });

  it('gives the HOLDER a wallet-centric workspace', () => {
    const labels = navigationFor('HOLDER').flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toContain('My Wallet');
    expect(labels).toContain('My Credentials');
    expect(labels).toContain('Share Credential');
    expect(labels).toContain('Notifications');
    expect(labels).toContain('Settings');
  });

  it('does not expose institution or admin routes to a HOLDER', () => {
    const sections = navigationFor('HOLDER');
    const paths = sections.map((s) => ({ section: s.label, items: s.items.map((i) => i.path) }));
    expect(JSON.stringify(paths)).not.toContain('/institution/issue');
    expect(JSON.stringify(paths)).not.toContain('/admin/users');
    expect(JSON.stringify(paths)).not.toContain('/security');
  });

  it('gives SECURITY_ADMIN a security-focused workspace with admin overview', () => {
    const labels = navigationFor('SECURITY_ADMIN').flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toContain('Security Center');
    expect(labels).toContain('Fraud & Tampering');
    expect(labels).toContain('Security Alerts');
    expect(labels).toContain('Overview');
  });

  it('restricts AUDITOR from user management but keeps audit visibility', () => {
    const sections = navigationFor('AUDITOR');
    const flat = sections.flatMap((s) => s.items);
    expect(flat.some((i) => i.path === '/admin/users')).toBe(false);
    expect(flat.some((i) => i.path === '/admin/security/audit')).toBe(true);
    expect(flat.some((i) => i.path === '/security')).toBe(true);
  });

  it('keeps every nav item pointing at a role the user may access', () => {
    const roleGroups: Array<[UserRole, string[]]> = [
      ['HOLDER', ['/holder', '/verify', '/explorer', '/notifications', '/account']],
      ['INSTITUTION', ['/institution', '/explorer', '/notifications', '/account']],
      ['EMPLOYER', ['/employer', '/verify', '/explorer', '/notifications', '/account']],
      ['ADMIN', ['/admin', '/security', '/fraud', '/explorer', '/notifications', '/account']],
    ];
    for (const [role, allowedPrefixes] of roleGroups) {
      const sections = navigationFor(role);
      for (const item of sections.flatMap((s) => s.items)) {
        const ok = allowedPrefixes.some((prefix) => item.path.startsWith(prefix));
        expect(ok, `${role} item ${item.path} must be relevant to that role`).toBe(true);
      }
    }
  });
});

describe('sectionForPath', () => {
  it('resolves a section and label for a known path', () => {
    expect(sectionForPath('/holder/wallet')).toEqual({ section: 'Workspace', label: 'My Wallet' });
    expect(sectionForPath('/security/alerts')).toEqual({ section: 'Security', label: 'Security Alerts' });
    expect(sectionForPath('/institution/issue')).toEqual({ section: 'Trust', label: 'Issue Credential' });
  });

  it('returns an empty context for unknown paths', () => {
    expect(sectionForPath('/nonsense/xyz')).toEqual({});
  });
});