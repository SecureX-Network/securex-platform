import { randomBytes } from 'node:crypto';

export function randomToken(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export function entityId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomToken(6)}`;
}

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

export function nowIso(): string {
  return new Date().toISOString();
}