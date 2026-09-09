import { randomBytes, randomUUID } from 'node:crypto';

export function randomToken(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Backend-generated internal database identity for a new record.
 *
 * `{prefix}-{uuid v4}`: cryptographically unique, never guessed by clients,
 * safe against collision (reinforced by the PRIMARY KEY constraint in PG).
 * Records created at runtime use this; seeded demo records keep their
 * canonical ids (cred-001, usr-admin-001, ...) so SIH references never break.
 *
 * NOTE: uuid v4 hex contains '-' too, so ids keep the `prefix-` form.
 */
export function entityId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

/**
 * Unique opaque identifier for a new session JWT claim. Kept in the legacy
 * `sess-` shape because it is embedded in signed tokens, not a public identity.
 */
export function newJti(): string {
  return `sess-${Date.now().toString(36)}-${randomToken(8)}`;
}

const HEX = '0123456789abcdef';

/** Deterministic pseudo-random hex string from a seed (mirrors the mock layer). */
export function makeHex(seed: number, length = 64): string {
  let state = seed % 2_147_483_647;
  let out = '';
  for (let i = 0; i < length; i++) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_647;
    out += HEX.charAt(state % 16);
  }
  return out;
}

function credentialIdPart(seed: number): string {
  return makeHex(seed + Math.floor(Math.random() * 9000), 4).toUpperCase();
}

/** Public credential ID in SX-XXXX-XXXX-XXXX form (mirrors the mock layer). */
export function newPublicCredentialId(seed: number): string {
  return `SX-${credentialIdPart(seed)}-${credentialIdPart(seed + 997)}-${credentialIdPart(seed + 3117)}`;
}

/**
 * Collision-safe ledger transaction id in the wire-contract `0x...` hex form.
 * The deterministic hex prefix keeps the format, the random tail guarantees
 * uniqueness against the transactions PRIMARY KEY even for rapid concurrent
 * issues/revokes of the same credential.
 */
export function newTxRef(): string {
  return `0x${makeHex((Date.now() % 97_000) + 1_000, 34)}${randomToken(14)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}