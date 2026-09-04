// ---------------------------------------------------------------------------
// Off-chain Holder <-> Credential ownership registry.
//
// The SecureX blockchain ledger stores NO holder binding (credentials carry
// only credentialId, issuerId, credentialHash, status — never PII). Ownership
// of a credential by a holder is a PRODUCT-LAYER concern, held here off-chain
// and NEVER written to the chain.
//
// This registry maps a holder id to the credential ids they own, persisted in
// localStorage so ownership survives navigation and reloads. The credential
// *state* still comes from the real on-chain backend at read time.
// ---------------------------------------------------------------------------

/**
 * The on-chain demo credential set, used to enumerate the REAL chain's seeded
 * credentials (see backend scripts/demo-data.ts). These are public credential
 * identifiers (no PII). Used to probe the real backend; ownership of them by a
 * holder is decided by the off-chain registry below, NOT by this list alone.
 */
export const REAL_DEMO_CREDENTIAL_IDS = [
  'sxu-btech-2026-0001',
  'sxu-mtech-2026-0001',
  'sxu-mba-2026-0001',
  'sxti-bca-2026-0001',
  'sxti-mca-2026-0001',
  'sxti-pro-cert-2026-0001',
  'sxpa-intern-2026-0001',
  'sxpa-pro-cert-2026-0001',
];

/**
 * Public verification identifiers for the same demo credential set, in the
 * SAME ORDER as `REAL_DEMO_CREDENTIAL_IDS` above. These map 1:1 to the public
 * credential IDs seeded by the backend (see scripts/demo-data.ts) and are the
 * ONLY identifiers shown on the PUBLIC verification surfaces (VerifyPage
 * samples). Internal holders/wallets keep using `REAL_DEMO_CREDENTIAL_IDS`,
 * never these public IDs for internal lookups.
 */
export const REAL_DEMO_PUBLIC_CREDENTIAL_IDS = [
  'SX-2F9C-A41B-8D7E',
  'SX-7A31-C0E4-19F6',
  'SX-4B8D-6A2F-C701',
  'SX-9C4E-2D80-5A31',
  'SX-3A17-B9F2-6D48',
  'SX-8E50-1C73-A9B4',
  'SX-6D29-B8E5-0F4C',
  'SX-5A40-9F61-D2B7',
];

/**
 * DEMO-ONLY opaque QR binding tokens, in the SAME ORDER as
 * `REAL_DEMO_PUBLIC_CREDENTIAL_IDS`. In production the opaque token is an
 * HMAC derived from a server-held key and the QR is authenticated by an
 * Ed25519 signature; neither the browser nor the QR image can derive the
 * public ID from it (the backend is the trust boundary). For the self-contained
 * DEMO/mock runner there is no live backend, so we use fixed opaque fixture
 * tokens that a demo scanner maps back to the seeded public IDs. These tokens
 * intentionally contain NO readable public internal credential ID.
 */
export const REAL_DEMO_QR_TOKENS = [
  'tK9p2RmQvN0wLxZ8bYcA3dF4gH6jS1eU5hI7nM2oP8qR',
  'qW3eR5tY8uI4oP7aS9dF2gH1jK6lZ0xC4vB6nM1zX8cV',
  'aF2gH1jK6lZ0xC4vB6nM3wQ1eR5tY8uI9oP2aS7dF4gH1',
  'zX8cV7bN6mM1qW3eR5tY4uI9oP2aS6dF8gH1jK0lZ4x',
  'pQ5aS9dF2gH1jK6lZ0xC4vB7nM3wQ1eR8tY2uI4oP6a',
  'mM1qW3eR5tY8uI4oP7aS2dF9gH1jK6lZ0xC4vB6nN',
  'dF4gH1jK6lZ0xC4vB7nM3wQ1eR5tY8uI9oP2aS6dF8g',
  'uI4oP7aS2dF9gH1jK6lZ0xC4vB6nM1qW3eR5tY8uI',
];

const OWNERSHIP_KEY = 'securex_holder_ownership_v1';

/**
 * Deterministic demo ownership seed for the SIH demo. Maps demo holders to the
 * demo credential set so each holder sees a realistic, distinct wallet. These
 * bindings are demo product data (not on-chain), keyed by the demo holder ids
 * used by the mock auth/seed identities.
 */
export const SEED_HOLDER_OWNERSHIP: Record<string, string[]> = {
  'usr-holder-001': REAL_DEMO_CREDENTIAL_IDS.slice(0, 3),
  'usr-holder-002': REAL_DEMO_CREDENTIAL_IDS.slice(3, 6),
  'usr-holder-003': REAL_DEMO_CREDENTIAL_IDS.slice(6, 8),
  'alice': REAL_DEMO_CREDENTIAL_IDS.slice(0, 2),
};

function readOwnership(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(OWNERSHIP_KEY);
    if (!raw) return { ...SEED_HOLDER_OWNERSHIP };
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return { ...SEED_HOLDER_OWNERSHIP, ...parsed };
  } catch {
    return { ...SEED_HOLDER_OWNERSHIP };
  }
}

function writeOwnership(map: Record<string, string[]>): void {
  try {
    localStorage.setItem(OWNERSHIP_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable (e.g. SSR/private mode); ownership falls back to seed
  }
}

/** Credential ids owned by a holder (from the product-layer registry). */
export function getCredentialIdsForHolder(holderId: string): string[] {
  return readOwnership()[holderId] ?? [];
}

/**
 * Access control primitive. Returns true only when the credential id appears in
 * the holder's owned set. No PII is involved — only the ownership binding.
 */
export function holderOwnsCredential(holderId: string, credentialId: string): boolean {
  return getCredentialIdsForHolder(holderId).includes(credentialId);
}

/** Record a credential as owned by a holder (product-layer persistence). */
export function grantCredentialToHolder(holderId: string, credentialId: string): void {
  const map = readOwnership();
  const list = map[holderId] ?? [];
  if (!list.includes(credentialId)) {
    map[holderId] = [...list, credentialId];
    writeOwnership(map);
  }
}

/** Clear the persisted registry (returns to seed). */
export function resetOwnershipRegistry(): void {
  try {
    localStorage.removeItem(OWNERSHIP_KEY);
  } catch {
    /* ignore */
  }
}

/** DEMO opaque QR token for a public credential ID (1:1 fixture mapping). */
export function demoQrTokenForPublicId(publicId: string): string | undefined {
  const idx = REAL_DEMO_PUBLIC_CREDENTIAL_IDS.indexOf(publicId);
  return idx >= 0 ? REAL_DEMO_QR_TOKENS[idx] : undefined;
}

/** DEMO reverse mapping: opaque QR token -> public credential ID. */
export function publicIdForDemoQrToken(token: string): string | undefined {
  const idx = REAL_DEMO_QR_TOKENS.indexOf(token);
  return idx >= 0 ? REAL_DEMO_PUBLIC_CREDENTIAL_IDS[idx] : undefined;
}
