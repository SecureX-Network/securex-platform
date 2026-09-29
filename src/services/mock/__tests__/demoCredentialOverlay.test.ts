import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credential } from '@/types';

/**
 * DEMO credentials issued/revoked during a walkthrough must survive a reload.
 * In REAL mode these writes hit the platform database, so the DEMO runner has to
 * behave the same way: without persistence a credential an institution just
 * issued reads as "not found" once the demo reloads or switches role, which
 * breaks the issue -> verify -> revoke -> re-verify journey.
 */
describe('DEMO credential overlay', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function loadFresh() {
    vi.resetModules();
    return import('@/services/mock/data');
  }

  function issuePayload(overrides: Partial<Credential> = {}) {
    return {
      type: 'Certificate',
      title: 'Overlay Certificate',
      description: 'Issued during a test run.',
      holderName: 'Emily Rodriguez',
      holderEmail: 'emily.rodriguez@example.com',
      issuerId: 'iss-stanford',
      issuerName: 'Stanford Office of the Registrar',
      institutionId: 'inst-stanford',
      institutionName: 'Stanford University',
      ...overrides,
    };
  }

  it('keeps a credential issued in DEMO mode after a reload', async () => {
    const { issueCredential } = await import('@/services/api/credentialService');
    const issued = await issueCredential(issuePayload());

    const { MOCK_CREDENTIALS } = await loadFresh();

    const found = MOCK_CREDENTIALS.find((c) => c.credentialId === issued.credentialId);
    expect(found).toBeDefined();
    expect(found?.status).toBe('VALID');
  });

  it('keeps a revocation after a reload, including for a credential issued in the same session', async () => {
    const { issueCredential, revokeCredential } = await import(
      '@/services/api/credentialService'
    );
    const issued = await issueCredential(issuePayload());
    await revokeCredential(issued.id);

    const { MOCK_CREDENTIALS } = await loadFresh();

    const found = MOCK_CREDENTIALS.find((c) => c.credentialId === issued.credentialId);
    expect(found).toBeDefined();
    expect(found?.status).toBe('REVOKED');
    expect(found?.revokedAt).toBeTruthy();
  });

  it('reports the revoked status through the public verification lookup', async () => {
    const { issueCredential, revokeCredential } = await import(
      '@/services/api/credentialService'
    );
    const { verifyCredential } = await import('@/services/api/verificationService');

    const issued = await issueCredential(issuePayload());
    await revokeCredential(issued.id);

    // Fresh module graph, as if the verifier loaded the page after the reload.
    vi.resetModules();
    const freshVerify = (await import('@/services/api/verificationService'))
      .verifyCredential;

    const result = await freshVerify(issued.credentialId);

    expect(result.status).toBe('REVOKED');
    expect(result.checks.credentialRecord.verified).toBe(true);
    // Guards against the module instance captured above being used by mistake.
    void verifyCredential;
  });

  it('returns the dataset to its shipped state when the overlay is reset', async () => {
    const { issueCredential } = await import('@/services/api/credentialService');
    const { resetDemoCredentialOverlay } = await import('@/services/mock/data');
    await issueCredential(issuePayload());

    resetDemoCredentialOverlay();
    const { MOCK_CREDENTIALS } = await loadFresh();

    expect(MOCK_CREDENTIALS.some((c) => c.title === 'Overlay Certificate')).toBe(false);
  });
});
