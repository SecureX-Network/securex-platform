import {
  isPublicCredentialId,
  normalizeCredentialInput,
  parseSecureXQr,
  SECUREX_QR_PREFIX,
} from '@/utils/publicCredentialId';

describe('isPublicCredentialId', () => {
  it('accepts canonical public IDs', () => {
    expect(isPublicCredentialId('SX-2F9C-A41B-8D7E')).toBe(true);
    expect(isPublicCredentialId('SX-9D61-4AC8-0F3B')).toBe(true);
  });

  it('rejects internal, malformed and lowercase IDs', () => {
    expect(isPublicCredentialId('sxu-btech-2026-0001')).toBe(false);
    expect(isPublicCredentialId('sx-2f9c-a41b-8d7e')).toBe(false);
    expect(isPublicCredentialId('SX-2F9C-A41B')).toBe(false);
    expect(isPublicCredentialId('SX-2F9C-A41B-8D7G')).toBe(false);
    expect(isPublicCredentialId('')).toBe(false);
  });
});

describe('normalizeCredentialInput', () => {
  it('upper-cases public IDs (case-insensitive on input)', () => {
    expect(normalizeCredentialInput('sx-2f9c-a41b-8d7e')).toBe('SX-2F9C-A41B-8D7E');
    expect(normalizeCredentialInput('  sx-2f9c-a41b-8d7e ')).toBe('SX-2F9C-A41B-8D7E');
  });

  it('trims but does not alter internal IDs', () => {
    expect(normalizeCredentialInput(' sxu-btech-2026-0001 ')).toBe('sxu-btech-2026-0001');
  });

  it('only treats the sx- prefix (with dash) as public', () => {
    // internal IDs use sxu-/sxti-/sxpa- (no dash after sx) and are untouched
    expect(normalizeCredentialInput('sxu-btech-2026-0001')).toBe('sxu-btech-2026-0001');
    expect(normalizeCredentialInput('sxti-bca-2026-0001')).toBe('sxti-bca-2026-0001');
  });
});

describe('parseSecureXQr', () => {
  const TOKEN = 'tK9p2RmQvN0wLxZ8bYcA3dF4gH6jS1eU5hI7nM2oP8qR';
  const ISSUED_AT = '1780000000000';
  const SIG = 'a'.repeat(128);
  const VALID = `${SECUREX_QR_PREFIX}.${TOKEN}.${ISSUED_AT}.v1.${SIG}`;

  it('parses a valid opaque SecureX QR payload', () => {
    const result = parseSecureXQr(VALID);
    expect(result.ok).toBe(true);
    expect(result.payload).toBe(VALID);
    expect(result.token).toBe(TOKEN);
    expect(result.version).toBe('1');
  });

  it('does not leak a readable public/internal credential ID from the payload', () => {
    expect(VALID).not.toContain('SX-');
    expect(VALID).not.toContain('sxu-');
    expect(parseSecureXQr(VALID).payload?.includes('SX-')).toBe(false);
  });

  it('rejects ordinary URLs', () => {
    for (const s of [
      'https://example.com/verify/SX-2F9C-A41B-8D7E',
      'http://example.com',
      'javascript:alert(1)',
      'file:///etc/passwd',
    ]) {
      const result = parseSecureXQr(s);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('not-secure-x');
    }
  });

  it('rejects unrelated QR formats', () => {
    for (const s of ['hello', 'SX-2F9C-A41B-8D7E', '', 'https://x.io']) {
      const result = parseSecureXQr(s);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects a SecureX marker with an unsupported version', () => {
    const result = parseSecureXQr(`${SECUREX_QR_PREFIX}.${TOKEN}.${ISSUED_AT}.v2.${SIG}`);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unsupported-version');
  });

  it('rejects a malformed SecureX payload', () => {
    for (const s of [
      `${SECUREX_QR_PREFIX}.${TOKEN}`,
      `${SECUREX_QR_PREFIX}.${TOKEN}.${ISSUED_AT}.v1`,
      `${SECUREX_QR_PREFIX}.not_a_payload`,
      `${SECUREX_QR_PREFIX}.`,
      `${SECUREX_QR_PREFIX}.${TOKEN}.${ISSUED_AT}.v1.${SIG}.extra`,
      `${SECUREX_QR_PREFIX}.${TOKEN}.${ISSUED_AT}.vX.${SIG}`,
      `${SECUREX_QR_PREFIX}.${TOKEN}.${ISSUED_AT}.v1.${'a'.repeat(127)}`,
      `${SECUREX_QR_PREFIX}.${TOKEN}.not-a-time.v1.${SIG}`,
    ]) {
      const result = parseSecureXQr(s);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('malformed');
    }
  });
});
