import { describe, expect, it } from 'vitest';
import { MOCK_USERS } from '@/services/mock';

/**
 * The recorded demo signs in as every role it narrates, so each of those roles
 * needs a real account in the mock dataset. ISSUER was the gap: the sign-in
 * page could not offer it and no ISSUER user existed, so the issuer desk could
 * never be demonstrated.
 */
describe('ISSUER demo account', () => {
  const issuer = MOCK_USERS.find((u) => u.role === 'ISSUER');

  it('exists', () => {
    expect(issuer).toBeDefined();
    expect(issuer!.email).toBe('cs-graduation@stanford.edu');
  });

  it('is scoped to an institution rather than granted admin', () => {
    expect(issuer!.institutionId).toBe('inst-stanford');
    expect(issuer!.role).not.toBe('ADMIN');
  });

  it('shares the documented demo password so the "Use" button works', () => {
    expect(issuer!.password).toBe('Password123!');
  });

  it('is addressable by the seeded issuer email', () => {
    // The account email matches a registered issuer (iss-stanford-cs) so the
    // demo identity is coherent with the issuer registry.
    expect(issuer!.email).toBe('cs-graduation@stanford.edu');
  });

  it('keeps every user email unique', () => {
    const emails = MOCK_USERS.map((u) => u.email);
    expect(new Set(emails).size).toBe(emails.length);
  });
});
