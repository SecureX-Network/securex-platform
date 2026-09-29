import { describe, expect, it } from 'vitest';
import { MOCK_CREDENTIALS } from '@/services/mock/data';
import { getRealQrReference, resolveSecureXQrPayload } from '../holderAdminService';

/**
 * DEMO QR round trip: whatever the holder can put on screen must be resolvable by
 * the public scanner. These cases cover BOTH entry points the UI actually uses:
 * the share page passes the public ID, the credential detail page passes the
 * internal route id.
 */
describe('DEMO SecureX QR round trip', () => {
  it('resolves a QR generated from the internal route id (credential detail page)', async () => {
    const ref = await getRealQrReference('cred-001');
    const resolved = await resolveSecureXQrPayload(ref.qrContent);
    expect(resolved.ok).toBe(true);
    expect(resolved.publicCredentialId).toBe('SX-2F9C-A41B-8D7E');
  });

  it('resolves a QR generated from the public id (share page)', async () => {
    const ref = await getRealQrReference('SX-2F9C-A41B-8D7E');
    const resolved = await resolveSecureXQrPayload(ref.qrContent);
    expect(resolved.ok).toBe(true);
    expect(resolved.publicCredentialId).toBe('SX-2F9C-A41B-8D7E');
  });

  it('resolves a QR for every credential in the demo dataset', async () => {
    for (const cred of MOCK_CREDENTIALS) {
      const ref = await getRealQrReference(cred.id);
      const resolved = await resolveSecureXQrPayload(ref.qrContent);
      expect(
        resolved.ok,
        `QR for ${cred.id} (${cred.credentialId}) was not resolvable`,
      ).toBe(true);
      expect(resolved.publicCredentialId).toBe(cred.credentialId);
    }
  });
});
