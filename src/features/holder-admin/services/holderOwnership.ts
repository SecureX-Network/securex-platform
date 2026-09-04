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
