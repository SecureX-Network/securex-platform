import { MOCK_CREDENTIALS } from '@/services/mock/data';

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

/**
 * The offline DEMO wallet dataset (see `MOCK_CREDENTIALS`) is a SEPARATE fixture
 * set from the on-chain seed above: it carries its own internal ids (cred-00N)
 * and its own public ids. Both are reachable from the UI, so both have to yield
 * a scannable QR: the share page hands `getRealQrReference` a public id, while
 * the credential detail page hands it the internal route id. Public ids that
 * already own a token in `REAL_DEMO_QR_TOKENS` keep it; the rest get the fixed
 * opaque tokens below (same properties: no readable public ID, no derivation).
 */
const DEMO_WALLET_QR_TOKENS: Record<string, string> = {
  'SX-8B31-7C0D-4A6E': 'nSYSo9veycFuHqu_q7jEJCixxgGTduDkYGb2v7Ra',
  'SX-5E42-90F3-1B6C': 'PORWSy6EE08WPyldLaV8bJsrT_y1M4BkGOjOwVU_',
  'SX-7A18-3D5F-90E2': 'yQplRq_MDUFJEq2Es42Y_JIvP8b-aRJPGUXWaOgm',
  'SX-C0B4-62A7-5E91': 'qByM2qW1T_uUDrVkEeOHdGMcD1r2sjiikvchYEVT',
  'SX-3E97-D120-8B4F': 'YRSwCHjy0icYHHH-kZ-MnizeIfvHAIPX1xFigQar',
  'SX-9D61-4AC8-0F3B': 'ywvJUFnD8d1u0MFaVZDUL0wGlbyjxn8E5W7qv4P3',
  'SX-16A5-E9B2-7C40': 'LCt8NGdQdpz1lksYWKE7Yx0Z87ViKfETwJMLDqSJ',
  'SX-4B8F-C1D6-29A3': '2ZT1hr-UjvYndbBC_ixUAoPNi2U5sbKaWCh0x4Av',
  'SX-F7C3-58E0-1D9A': 'EuaDryt_bwj8bdctyHNcpGbU9dLr22J5OCrQJQXx',
  'SX-2A64-9B7E-50CD': 'iVnpEqd9oA5VbBFlH_4-i9hrKqMHb2w9aP-YUCOg',
  'SX-83E1-0FA6-4B92': '0lE8brnQak8mHQR1_tRUwwMgmtgTlW7c1kGF3gva',
  'SX-5C97-D3B8-6E01': 'oDGOkZMUtQiwEP26p6tKFrco1fcrB7FoKsYyk1EQ',
  'SX-D0A2-71EC-9B45': 'ArR6Axs1ugjeRInoT_kJbBl3OIkaRPAs7UagUBGS',
  'SX-EF4B-390A-7C58': 'hngGSAyRtNOrWJGBoTGL66nOWpMEbJ75lBVG2HZB',
};

/**
 * Pair two ordered (1:1) fixture lists. Entries past the end of either list are
 * skipped rather than asserted, so a fixture can grow on one side without
 * producing a half-populated mapping.
 */
function zipFixturePairs(left: readonly string[], right: readonly string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < left.length && i < right.length; i += 1) {
    const a = left[i];
    const b = right[i];
    if (a !== undefined && b !== undefined) pairs.push([a, b]);
  }
  return pairs;
}

const QR_TOKEN_BY_PUBLIC_ID: ReadonlyMap<string, string> = new Map([
  ...zipFixturePairs(REAL_DEMO_PUBLIC_CREDENTIAL_IDS, REAL_DEMO_QR_TOKENS),
  ...Object.entries(DEMO_WALLET_QR_TOKENS),
]);

const PUBLIC_ID_BY_QR_TOKEN: ReadonlyMap<string, string> = new Map(
  [...QR_TOKEN_BY_PUBLIC_ID].map(([publicId, token]) => [token, publicId]),
);

const PUBLIC_ID_BY_INTERNAL_ID: ReadonlyMap<string, string> = new Map([
  ...zipFixturePairs(REAL_DEMO_CREDENTIAL_IDS, REAL_DEMO_PUBLIC_CREDENTIAL_IDS),
  ...MOCK_CREDENTIALS.map(
    (credential) => [credential.id, credential.credentialId] as [string, string],
  ),
]);

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
  return QR_TOKEN_BY_PUBLIC_ID.get(publicId);
}

/** DEMO reverse mapping: opaque QR token -> public credential ID. */
export function publicIdForDemoQrToken(token: string): string | undefined {
  return PUBLIC_ID_BY_QR_TOKEN.get(token);
}

/**
 * DEMO mapping: internal credential id (the route param the credential detail
 * page passes) -> public verification id. Covers the on-chain seed ids and the
 * offline wallet dataset. Public IDs are never derived from internal IDs.
 */
export function demoPublicIdForInternalId(internalId: string): string | undefined {
  return PUBLIC_ID_BY_INTERNAL_ID.get(internalId);
}
