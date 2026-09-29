// ---------------------------------------------------------------------------
// EFFECTIVE CREDENTIAL STATUS
//
// A credential row's `status` column is the issuer's recorded intent. It is NOT
// sufficient on its own to answer "is this credential valid right now?", because
// `expires_at` is independent of `status`: a row can sit at 'VALID' long after
// its expiry timestamp has passed.
//
// This module derives the effective status for a point in time. It is PURE — it
// never writes to the database. Read paths (public verification, authenticated
// credential/admin/institution reads) call it so an expired credential is
// reported as EXPIRED instead of continuing to present as VALID.
//
// Precedence (highest first):
//   1. REVOKED            — a revocation is terminal and outranks expiry.
//   2. EXPIRED            — expires_at exists and is at or before `now`.
//   3. stored status      — whatever the issuer recorded (SUSPENDED, TAMPERED,
//                           SUSPICIOUS, INVALID, VALID, ...).
//
// A stored 'EXPIRED' always stays EXPIRED even if expires_at is somehow null.
// ---------------------------------------------------------------------------

export const CREDENTIAL_STATUSES = [
  'VALID',
  'INVALID',
  'REVOKED',
  'SUSPENDED',
  'EXPIRED',
  'TAMPERED',
  'SUSPICIOUS',
  'NOT_FOUND',
] as const;

export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

/** Statuses that outrank expiry: a revocation/suspension is issuer intent. */
const TERMINAL_STATUSES: readonly string[] = ['REVOKED', 'SUSPENDED', 'TAMPERED', 'INVALID'];

export interface StatusSource {
  status: string;
  expires_at: string | null;
}

/** Coerce an arbitrary stored string to a known status (unknown -> INVALID). */
export function normalizeCredentialStatus(status: string): CredentialStatus {
  return (CREDENTIAL_STATUSES as readonly string[]).includes(status)
    ? (status as CredentialStatus)
    : 'INVALID';
}

/** True when `expires_at` exists and is at or before `now`. */
export function isExpiredAt(
  expiresAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  // An unparseable expiry is NOT treated as expired: we never invent an expiry
  // date, and we never silently downgrade a record on a malformed value.
  if (Number.isNaN(expiry)) return false;
  return expiry <= now;
}

/**
 * Derive the effective status of a credential at `now`.
 * Pure: no database mutation, no side effects.
 */
export function effectiveCredentialStatus(
  source: StatusSource,
  now: number = Date.now(),
): CredentialStatus {
  const stored = normalizeCredentialStatus(source.status);

  if (stored === 'REVOKED') return 'REVOKED';
  if (stored === 'EXPIRED') return 'EXPIRED';
  if (isExpiredAt(source.expires_at, now)) return 'EXPIRED';
  if (TERMINAL_STATUSES.includes(stored)) return stored;
  return stored;
}

/** True when the effective status still presents as usable. */
export function isCurrentlyValid(
  source: StatusSource,
  now: number = Date.now(),
): boolean {
  return effectiveCredentialStatus(source, now) === 'VALID';
}
