import { IS_MOCK } from '@/constants';
import { ApiError, fetchPlatformAPI } from '@/services/api/client';
import {
  CHAIN_API_PREFIX,
  type ChainAuditEventDto,
  type ChainCredentialHistoryDto,
  type ChainHealthDto,
  type ChainIssuerDto,
  type ChainIssuerHistoryDto,
  type ChainMutationReceiptDto,
  type ChainQrReferenceDto,
  type ChainQrVerifyDto,
  type ChainStateDto,
} from '@/services/api/blockchainProxy';
import { mockDelay } from '@/services/mock';
import type { AuditEvent, Credential, Issuer, UserRole } from '@/types';
import { SECUREX_QR_PREFIX } from '@/utils';
import { parseSecureXQr } from '@/utils/publicCredentialId';
import {
  REAL_DEMO_CREDENTIAL_IDS,
  REAL_DEMO_PUBLIC_CREDENTIAL_IDS,
  demoPublicIdForInternalId,
  demoQrTokenForPublicId,
  publicIdForDemoQrToken,
} from './holderOwnership';

export type DataSourceMode = 'REAL' | 'DEMO';

export function getDataSourceMode(): DataSourceMode {
  return IS_MOCK ? 'DEMO' : 'REAL';
}

/**
 * Every browser request goes to the SecureX Platform API and carries exactly one
 * credential: the Platform API session token, which the api client attaches
 * automatically. The blockchain service credential is server-only
 * (BLOCKCHAIN_AUTH_TOKEN) and is deliberately NOT configurable from the
 * frontend: a VITE_* variable would ship it inside the browser bundle.
 *
 * Authorization is therefore decided by the Platform API from the session, plus
 * object-level ownership from the credential's own database row.
 */

/**
 * Retry transient failures (network errors or server errors) a couple of times,
 * but never retry a 4xx: a 4xx means the backend authoritatively rejected the
 * request and retrying would be pointless (and would mask a wrong API call).
 */
function isRetryable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status >= 500);
}

async function runWithRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 600): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isRetryable(e) || attempt === retries) {
        throw e;
      }
      await mockDelay(delayMs);
    }
  }
  throw lastError;
}

/** Chain issuer status -> the shared Issuer status union. */
function mapIssuerStatus(status: string): Issuer['status'] {
  switch (status) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'REVOKED':
      return 'REVOKED';
    case 'SUSPENDED':
      return 'SUSPENDED';
    default:
      // An unrecognized chain status is shown as SUSPENDED rather than
      // presented as ACTIVE: the UI must not imply an active issuer on a
      // status it does not understand.
      return 'SUSPENDED';
  }
}

function mapApiIssuer(issuer: ChainIssuerDto, credentialsIssued = 0): Issuer {
  return {
    id: issuer.id,
    name: issuer.name,
    institutionId: issuer.id,
    institutionName: issuer.name,
    email: '',
    publicKey: issuer.publicKey,
    status: mapIssuerStatus(issuer.status),
    credentialsIssued,
    createdAt: issuer.createdAt,
  };
}

/** Map *frontend* role labels to a verified principal role label. */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
    case 'SECURITY_ADMIN':
    case 'NETWORK_ADMIN':
    case 'AUDITOR':
      return 'admin';
    case 'INSTITUTION':
    case 'ISSUER':
      return 'issuer';
    default:
      return role.toLowerCase();
  }
}

// ---------------------------------------------------------------------------
// Health / connectivity
// ---------------------------------------------------------------------------

export async function getBackendHealth(): Promise<ChainHealthDto | null> {
  if (getDataSourceMode() === 'DEMO') return null;
  try {
    return await runWithRetry(() =>
      fetchPlatformAPI<ChainHealthDto>(`${CHAIN_API_PREFIX}/health`),
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin: Issuer management (REAL backend state)
// ---------------------------------------------------------------------------

export async function getRealIssuers(): Promise<Issuer[]> {
  if (getDataSourceMode() === 'DEMO') {
    const { getAllIssuers } = await import('@/services/api/adminService');
    return getAllIssuers();
  }
  const issuers = await runWithRetry(() =>
    fetchPlatformAPI<ChainIssuerDto[]>(`${CHAIN_API_PREFIX}/issuers`),
  );
  return Promise.all(
    issuers.map(async (issuer) => {
      let count = 0;
      try {
        const history = await fetchPlatformAPI<ChainIssuerHistoryDto>(
          `${CHAIN_API_PREFIX}/issuers/${encodeURIComponent(issuer.id)}/history`,
        );
        count = history.credentials.length;
      } catch {
        count = 0;
      }
      return mapApiIssuer(issuer, count);
    }),
  );
}

export async function registerRealIssuer(input: {
  issuerId: string;
  name: string;
  publicKey: string;
  metadata?: Record<string, unknown>;
}): Promise<ChainMutationReceiptDto> {
  return runWithRetry(() =>
    fetchPlatformAPI<ChainMutationReceiptDto>(`${CHAIN_API_PREFIX}/issuers`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
}

export async function updateRealIssuer(
  issuerId: string,
  input: { name?: string; metadata?: Record<string, unknown> },
): Promise<ChainMutationReceiptDto> {
  return runWithRetry(() =>
    fetchPlatformAPI<ChainMutationReceiptDto>(
      `${CHAIN_API_PREFIX}/issuers/${encodeURIComponent(issuerId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),
  );
}

/**
 * Admin issuer lifecycle: the chain has no issuer suspend/activate operation.
 * An issuer's ACTIVE/SUSPENDED/REVOKED status is governed by the ledger, so a
 * browser cannot mutate it. We surface that honestly as an ApiError instead of
 * calling a non-existent endpoint or fabricating success. The page reflects the
 * authoritative status read (GET /blockchain/issuers).
 */
export async function suspendRealIssuer(
  _issuerId: string,
  _reason?: string,
): Promise<ChainMutationReceiptDto> {
  throw new ApiError(
    'Issuer status is governed by the SecureX ledger; the Platform API exposes no issuer suspension operation, so issuer status is read-only from the admin UI.',
    400,
  );
}

export async function activateRealIssuer(
  _issuerId: string,
  _reason?: string,
): Promise<ChainMutationReceiptDto> {
  throw new ApiError(
    'Issuer status is governed by the SecureX ledger; the Platform API exposes no issuer activation operation, so issuer status is read-only from the admin UI.',
    400,
  );
}

export async function getRealIssuer(id: string): Promise<Issuer> {
  const issuer = await runWithRetry(() =>
    fetchPlatformAPI<ChainIssuerDto>(
      `${CHAIN_API_PREFIX}/issuers/${encodeURIComponent(id)}`,
    ),
  );
  let count = 0;
  try {
    const history = await fetchPlatformAPI<ChainIssuerHistoryDto>(
      `${CHAIN_API_PREFIX}/issuers/${encodeURIComponent(id)}/history`,
    );
    count = history.credentials.length;
  } catch {
    count = 0;
  }
  return mapApiIssuer(issuer, count);
}

export async function getRealIssuerHistory(id: string): Promise<ChainIssuerHistoryDto> {
  return runWithRetry(() =>
    fetchPlatformAPI<ChainIssuerHistoryDto>(
      `${CHAIN_API_PREFIX}/issuers/${encodeURIComponent(id)}/history`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Credential records (REAL mode)
// ---------------------------------------------------------------------------
//
// Credential DISPLAY data (title, description, holder, issuer and institution
// names, stored references) is read from the Platform API's own credential
// record, which is the authority for it. The chain proxy is used for the
// on-chain lifecycle history, because that is the only place it exists.
//
// Access control is entirely server-side: GET /credentials is scoped to the
// caller's own holder/institution ownership and GET /credentials/:id reports an
// out-of-scope credential as not found. There is deliberately no browser-side
// ownership registry — the backend is the single authority for who may see what.

export { REAL_DEMO_CREDENTIAL_IDS };
export { REAL_DEMO_PUBLIC_CREDENTIAL_IDS };

export async function getRealCredentials(): Promise<Credential[]> {
  if (getDataSourceMode() === 'DEMO') {
    const { getCredentials } = await import('@/services/api/credentialService');
    return getCredentials();
  }
  return runWithRetry(() => fetchPlatformAPI<Credential[]>('/credentials'));
}

/**
 * The holder "My Credentials" view. `holderId` only NARROWS the result; the
 * Platform API refuses to widen it, so a holder cannot read another holder's
 * wallet by passing a different id.
 */
export async function getHolderCredentialsView(holderId: string): Promise<Credential[]> {
  if (getDataSourceMode() === 'DEMO') {
    const { getHolderCredentials } = await import('@/services/api/credentialService');
    return getHolderCredentials(holderId);
  }
  return runWithRetry(() =>
    fetchPlatformAPI<Credential[]>(`/credentials?holderId=${encodeURIComponent(holderId)}`),
  );
}

export async function getRealCredential(id: string): Promise<Credential> {
  if (getDataSourceMode() === 'DEMO') {
    const { getCredentialById } = await import('@/services/api/credentialService');
    return getCredentialById(id);
  }
  return runWithRetry(() =>
    fetchPlatformAPI<Credential>(`/credentials/${encodeURIComponent(id)}`),
  );
}

/** The on-chain lifecycle of a credential, as projected by the Platform API. */
export async function getRealCredentialHistory(
  id: string,
): Promise<ChainCredentialHistoryDto> {
  if (getDataSourceMode() === 'DEMO') return [];
  return runWithRetry(() =>
    fetchPlatformAPI<ChainCredentialHistoryDto>(
      `${CHAIN_API_PREFIX}/credentials/${encodeURIComponent(id)}/history`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Credential lifecycle transitions (relayed to the chain by the Platform API)
// ---------------------------------------------------------------------------
//
// The browser never builds or signs a chain transaction. It asks the Platform
// API for a lifecycle transition (POST /blockchain/credentials/:id/transitions);
// the Platform API authorizes the caller from the credential's own database
// ownership, builds the contract-shaped transaction server-side, and relays it
// with the server-held chain credential.
//
// The chain requires a signature from a registered issuer or validator key,
// which the Platform API does not hold, so an unsigned submission is expected
// to be REJECTED upstream. That rejection is surfaced verbatim as an error —
// never reported as a completed lifecycle change.

export interface LifecycleInput {
  reason?: string;
}

export type LifecycleAction = 'suspend' | 'reinstate' | 'revoke';

async function lifecycleTransition(
  id: string,
  action: LifecycleAction,
  input: LifecycleInput,
): Promise<ChainMutationReceiptDto> {
  const receipt = await runWithRetry(() =>
    fetchPlatformAPI<ChainMutationReceiptDto>(
      `${CHAIN_API_PREFIX}/credentials/${encodeURIComponent(id)}/transitions`,
      {
        method: 'POST',
        body: JSON.stringify(input.reason ? { action, reason: input.reason } : { action }),
      },
    ),
  );
  if (!receipt.submitted) {
    throw new ApiError(
      'The blockchain service did not accept the lifecycle transition.',
      502,
    );
  }
  return receipt;
}

function demoLifecycleReceipt(id: string): ChainMutationReceiptDto {
  return { submitted: true, id, status: 'PENDING' };
}

export async function suspendRealCredential(
  id: string,
  reason?: string,
): Promise<ChainMutationReceiptDto> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return demoLifecycleReceipt(id);
  }
  return lifecycleTransition(id, 'suspend', { reason });
}

export async function reinstateRealCredential(
  id: string,
  reason?: string,
): Promise<ChainMutationReceiptDto> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return demoLifecycleReceipt(id);
  }
  return lifecycleTransition(id, 'reinstate', { reason });
}

export async function revokeRealCredential(
  id: string,
  reason?: string,
): Promise<ChainMutationReceiptDto> {
  if (getDataSourceMode() === 'DEMO') {
    const { revokeCredential } = await import('@/services/api/credentialService');
    await revokeCredential(id);
    return demoLifecycleReceipt(id);
  }
  return lifecycleTransition(id, 'revoke', { reason });
}

/**
 * Reissue is NOT a supported lifecycle transition. The Platform API relays only
 * suspend / reinstate / revoke, so there is no reissue operation to call. We
 * report that honestly rather than submitting a differently-shaped transaction
 * and reporting a success the chain never acknowledged.
 */
export async function reissueRealCredential(
  _id: string,
  _input: {
    newCredentialId: string;
    newCredentialHash: string;
    reason?: string;
  },
): Promise<ChainMutationReceiptDto> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return { submitted: true, id: _id, status: 'PENDING' };
  }
  throw new ApiError(
    'Reissuing a credential is not a supported lifecycle transition. The SecureX Platform API relays suspend, reinstate and revoke only.',
    400,
  );
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
//
// Verification is answered by the Platform API's public verification surface
// (GET /verifications/:id), which is the single canonical verifier. It reports
// what was ACTUALLY checked and marks every capability SecureX has not
// implemented as unavailable, so the view below carries no field that would
// imply a blockchain proof or a signature check that never happened.

export type VerificationStatus =
  | 'VALID'
  | 'REVOKED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TAMPERED'
  | 'SUSPICIOUS'
  | 'INVALID'
  | 'NOT_FOUND';

export type VerificationCheckStatus = 'VERIFIED' | 'UNVERIFIED' | 'NOT_FOUND';

/**
 * One capability report.
 *
 *   verified   — the check genuinely ran and passed
 *   available  — a genuine implementation of the check exists at all
 */
export interface VerificationCheckView {
  verified: boolean;
  available: boolean;
  status: VerificationCheckStatus;
  /** Plain-language statement of exactly what was, and was not, checked. */
  detail: string;
}

export type DocumentIntegrityStatus = 'EXACT' | 'TAMPERED' | 'UNVERIFIABLE';

/**
 * A comparison of a caller-supplied document hash against the hash reference
 * stored on the SecureX Platform record. Explicitly NOT a blockchain anchor
 * check and NOT a signature check — the stored reference is never returned.
 */
export interface DocumentIntegrityView {
  credentialId: string;
  suppliedHash: string;
  hashMatch: boolean;
  status: DocumentIntegrityStatus;
  scope: 'PLATFORM_RECORD';
  detail: string;
  verifiedAt: string;
}

export interface VerificationView {
  credentialId: string;
  /** Effective status at verification time (EXPIRED derived from expiresAt). */
  status: VerificationStatus;
  /** The status literally recorded on the credential. */
  storedStatus: VerificationStatus;
  issuerName: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  verifiedAt: string;
  checks: {
    credentialRecord: VerificationCheckView;
    blockchainProof: VerificationCheckView;
    signature: VerificationCheckView;
  };
  documentIntegrity?: DocumentIntegrityView;
  message: string;
}

export async function verifyRealCredential(
  credentialId: string,
  documentHash?: string,
): Promise<VerificationView> {
  const { verifyPublicCredential } = await import(
    '@/features/public-verification/services/publicVerificationService'
  );
  return verifyPublicCredential(credentialId, documentHash);
}

/** DEMO fixed issuedAt (stable across renders so the demo QR is reproducible). */
const DEMO_QR_ISSUED_AT = 1780000000000;
/** DEMO fixed 64-byte (128 hex) Ed25519-shaped signature fixture. */
const DEMO_QR_SIGNATURE =
  'abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

export interface QrReferenceView {
  credentialId: string;
  version: string;
  exists: boolean;
  verificationUrl: string;
  qrContent: string;
}

export async function getRealQrReference(credentialId: string): Promise<QrReferenceView> {
  if (getDataSourceMode() === 'DEMO') {
    const publicId = resolveDemoPublicId(credentialId) ?? credentialId;
    const token = demoQrTokenForPublicId(publicId) ?? publicId;
    // DEMO QR content is opaque (no readable public ID): SXQR1.token.issuedAt.v1.sig
    const qrContent = `${SECUREX_QR_PREFIX}.${token}.${DEMO_QR_ISSUED_AT}.v1.${DEMO_QR_SIGNATURE}`;
    return {
      credentialId: publicId,
      version: '1',
      exists: true,
      verificationUrl: `${window.location.origin}/verify/${encodeURIComponent(publicId)}`,
      qrContent,
    };
  }
  return runWithRetry(() =>
    fetchPlatformAPI<ChainQrReferenceDto>(
      `${CHAIN_API_PREFIX}/qr/${encodeURIComponent(credentialId)}`,
    ),
  );
}

export interface ApiQrVerify {
  ok: boolean;
  publicCredentialId?: string;
  reason?: string;
}

/**
 * REAL mode: forward an opaque SecureX QR payload to the Platform API, which
 * relays it to the chain. The CHAIN is the component that authenticates the
 * payload signature and enforces its lifetime — SecureX does not verify it
 * itself and never claims to. `resolved: false` is a normal negative answer,
 * not a service error, so it is returned rather than thrown.
 */
export async function verifyQrPayloadViaApi(payload: string): Promise<ApiQrVerify> {
  try {
    const result = await runWithRetry(() =>
      fetchPlatformAPI<ChainQrVerifyDto>(`${CHAIN_API_PREFIX}/qr/verify`, {
        method: 'POST',
        body: JSON.stringify({ payload }),
      }),
    );
    if (!result.resolved || !result.credentialId) {
      return {
        ok: false,
        reason:
          result.reason ?? 'This SecureX QR reference could not be authenticated.',
      };
    }
    return { ok: true, publicCredentialId: result.credentialId };
  } catch (e) {
    const message =
      e instanceof ApiError
        ? e.message
        : 'Could not authenticate this SecureX QR reference.';
    return { ok: false, reason: message };
  }
}

/** Resolve an opaque SecureX QR payload to a public credential ID for display. */
export async function resolveSecureXQrPayload(payload: string): Promise<ApiQrVerify> {
  const parsed = parseSecureXQr(payload);
  if (!parsed.ok || !parsed.token) {
    const reason =
      parsed.reason === 'unsupported-version'
        ? 'This SecureX QR uses an unsupported protocol version.'
        : 'This is not a valid SecureX QR reference.';
    return { ok: false, reason };
  }
  if (getDataSourceMode() === 'DEMO') {
    const publicId = publicIdForDemoQrToken(parsed.token);
    if (!publicId) {
      return { ok: false, reason: 'This SecureX QR reference is not recognized.' };
    }
    return { ok: true, publicCredentialId: publicId };
  }
  return verifyQrPayloadViaApi(payload);
}

/**
 * Map an internal demo credential ID to its public verification ID using the
 * ordered (1:1) demo lists. Public IDs are never derived from internal IDs;
 * this is a fixed demo fixture mapping only (no ID derivation).
 */
function resolveDemoPublicId(internalId: string): string | undefined {
  return demoPublicIdForInternalId(internalId);
}

// ---------------------------------------------------------------------------
// Audit / evidence
// ---------------------------------------------------------------------------

function toAuditView(event: ChainAuditEventDto): AuditEvent {
  return {
    id: event.id,
    action: event.type,
    actor: event.actor ?? 'system',
    actorRole: deriveActorRole(event.actor),
    target: event.referenceId ?? event.credentialId ?? event.issuerId ?? '—',
    targetType: event.referenceType ?? 'blockchain',
    details: event.message,
    ipAddress: '',
    timestamp: event.timestamp,
  };
}

/**
 * Derive a display role for the audit actor. The chain reports the acting
 * identity as a label; we map it to the closest shared role for rendering only
 * (the Platform API remains the authority on who may perform a write).
 */
function deriveActorRole(actor?: string): UserRole {
  const a = actor?.toLowerCase() ?? '';
  if (a.includes('issuer')) return 'ISSUER';
  if (a.includes('institution')) return 'INSTITUTION';
  if (a.includes('employer')) return 'EMPLOYER';
  if (a.includes('holder')) return 'HOLDER';
  return 'ADMIN';
}

export async function getRealAuditEvents(
  limit = 100,
  offset = 0,
): Promise<AuditEvent[]> {
  if (getDataSourceMode() === 'DEMO') {
    const { getAuditEvents } = await import('@/services/api/adminService');
    return getAuditEvents();
  }
  const events = await runWithRetry(() =>
    fetchPlatformAPI<ChainAuditEventDto[]>(
      `${CHAIN_API_PREFIX}/audit/events?limit=${limit}&offset=${offset}`,
    ),
  );
  return events.map(toAuditView);
}

export async function getRealStateSummary(): Promise<ChainStateDto | null> {
  if (getDataSourceMode() === 'DEMO') return null;
  try {
    return await runWithRetry(() =>
      fetchPlatformAPI<ChainStateDto>(`${CHAIN_API_PREFIX}/state`),
    );
  } catch {
    return null;
  }
}
