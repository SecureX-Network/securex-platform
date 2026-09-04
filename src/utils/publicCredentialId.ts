// ---------------------------------------------------------------------------
// Public credential verification ID helpers.
//
// The SecureX platform separates two identifiers for a single credential:
//   - INTERNAL:  e.g. `sxu-btech-2026-0001`  (ledger/issuer/holder side)
//   - PUBLIC:    e.g. `SX-2F9C-A41B-8D7E`    (verification, printed, QR-safe)
//
// This module only ever deals with the PUBLIC identifier. It never constructs
// or returns an internal credential ID, and nothing here is PII.
// ---------------------------------------------------------------------------

/** Canonical public credential ID shape. */
export const PUBLIC_CREDENTIAL_ID_REGEX =
  /^SX-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

/** True when a value is a well-formed public credential ID (`SX-XXXX-XXXX-XXXX`). */
export function isPublicCredentialId(value: string): boolean {
  return PUBLIC_CREDENTIAL_ID_REGEX.test(value);
}

/**
 * Normalize a user-entered credential reference:
 *   - public IDs (`sx-...`/`SX-...`) are upper-cased so the backend resolves
 *     them on the public path (public IDs are case-insensitive on input);
 *   - any other value (e.g. an internal/id style id) is only trimmed, so the
 *     backend's backward-compatible internal path is never altered.
 */
export function normalizeCredentialInput(value: string): string {
  const trimmed = value.trim();
  if (/^sx-/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

/**
 * SecureX QR protocol marker. A SecureX QR encodes an OPAQUE, AUTHENTICATED
 * payload of the form
 *
 *   `SXQR1.<opaqueToken>.<issuedAt>.<vVersion>.<signature>`
 *
 * The `opaqueToken` is an HMAC-derived binding for a public credential ID, and
 * `signature` is a server Ed25519 signature. IMPORTANT: the QR NEVER contains
 * the public credential ID, internal credential ID, a verification URL, or PII.
 * The backend is the trust boundary that authenticates the payload and resolves
 * it to the credential. The marker (`SXQR1.`) merely lets a scanner distinguish
 * a SecureX QR from an ordinary URL or an unrelated QR.
 */
export const SECUREX_QR_PREFIX = 'SXQR1';

/** Current SecureX QR payload version (matches backend REFERENCE_VERSION). */
export const SECUREX_QR_VERSION = '1';

export interface ParsedSecureXQr {
  ok: boolean;
  /** The raw opaque payload (`SXQR1.<token>.<issuedAt>.v1.<signature>`). */
  payload?: string;
  /** The opaque token field from the payload (no readable credential data). */
  token?: string;
  version?: string;
  reason?: 'not-secure-x' | 'malformed' | 'unsupported-version';
}

/**
 * Validate the STRUCTURE of a raw SecureX QR payload.
 *
 * Accepts only a well-formed OPAQUE payload
 * (`SXQR1.<token>.<issuedAt>.v<version>.<signature>`). The returned `token` is
 * opaque and carries no readable credential ID — callers resolve it through the
 * backend (`/verify/qr`) which is the trust boundary. Anything else — ordinary
 * URLs, `javascript:`/`file:` URIs, unrelated formats, or a malformed SecureX
 * payload — is rejected. Callers must NEVER navigate to an arbitrary URL.
 */
export function parseSecureXQr(raw: string): ParsedSecureXQr {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: 'malformed' };
  }
  const trimmed = raw.trim();
  if (/^(https?:|javascript:|file:|data:|vbscript:)/i.test(trimmed)) {
    return { ok: false, reason: 'not-secure-x' };
  }
  if (!trimmed.startsWith(SECUREX_QR_PREFIX + '.')) {
    return { ok: false, reason: 'not-secure-x' };
  }
  const rest = trimmed.slice(SECUREX_QR_PREFIX.length + 1);
  const parts = rest.split('.');
  if (parts.length !== 4) {
    return { ok: false, reason: 'malformed' };
  }
  const [token, issuedAtRaw, versionRaw, signature] = parts;
  if (!token || !issuedAtRaw || !versionRaw || !signature) {
    return { ok: false, reason: 'malformed' };
  }
  if (!/^v[0-9]+$/.test(versionRaw)) {
    return { ok: false, reason: 'malformed' };
  }
  if (versionRaw !== 'v' + SECUREX_QR_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }
  if (!/^[0-9]+$/.test(issuedAtRaw)) {
    return { ok: false, reason: 'malformed' };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    return { ok: false, reason: 'malformed' };
  }
  if (!/^[0-9a-fA-F]{128}$/.test(signature)) {
    return { ok: false, reason: 'malformed' };
  }
  return { ok: true, payload: trimmed, token, version: SECUREX_QR_VERSION };
}
