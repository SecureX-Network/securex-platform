import { IS_MOCK } from '@/constants';
import { ApiError, fetchBlockchainAPI } from '@/services/api/client';
import { mockDelay } from '@/services/mock';
import type { AuditEvent, Credential, Issuer, UserRole } from '@/types';
import { SECUREX_QR_PREFIX } from '@/utils';
import { parseSecureXQr } from '@/utils/publicCredentialId';
import type {
  ApiAuditEvent,
  ApiCredential,
  ApiCredentialHistoryEntry,
  ApiHealth,
  ApiIssuer,
  ApiIssuerHistory,
  ApiMutationReceipt,
  ApiQrReference,
  ApiStateSummary,
  ApiVerificationStatus,
  ApiVerifyResult,
} from '@/features/holder-admin/types/backend';
import {
  REAL_DEMO_CREDENTIAL_IDS,
  REAL_DEMO_PUBLIC_CREDENTIAL_IDS,
  demoQrTokenForPublicId,
  publicIdForDemoQrToken,
  getCredentialIdsForHolder,
  holderOwnsCredential,
} from './holderOwnership';

export type DataSourceMode = 'REAL' | 'DEMO';

export function getDataSourceMode(): DataSourceMode {
  return IS_MOCK ? 'DEMO' : 'REAL';
}

/**
 * Build the Authorization header token for privileged backend endpoints.
 *
 * The SecureX blockchain backend uses a dev/demo shared-secret authenticator
 * (role:secret tokens configured via CTN_AUTH_TOKENS). When admin credentials
 * are configured in the frontend environment we forward them; otherwise
 * privileged writes are attempted unauthenticated (module-level cryptographic
 * validation still constrains them). This NEVER stores or fabricates roles in
 * the browser — the backend remains the authority.
 */
function authHeaders(): HeadersInit {
  const token = import.meta.env.VITE_BLOCKCHAIN_AUTH_TOKEN as string | undefined;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

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

function mapApiIssuer(issuer: ApiIssuer, credentialsIssued = 0): Issuer {
  return {
    id: issuer.issuerId,
    name: issuer.name,
    institutionId: issuer.issuerId,
    institutionName: issuer.name,
    email: '',
    publicKey: issuer.publicKey,
    status: issuer.status,
    credentialsIssued,
    createdAt: issuer.registeredAt,
  };
}

/** Translate the backend credential record into the shared frontend Credential shape. */
function mapApiCredential(
  cred: ApiCredential,
  issuerName?: string,
): Credential {
  const metadata = cred.metadata ?? {};
  const type = String(metadata.credentialType ?? 'Credential');
  const subject = String(metadata.subject ?? cred.credentialId);
  const issueEvent = cred.lifecycle.find((ev) => ev.type === 'ISSUED');

  return {
    id: cred.credentialId,
    credentialId: cred.credentialId,
    type,
    title: subject,
    description: '',
    holderName: '',
    holderId: '',
    issuerId: cred.issuerId,
    issuerName: issuerName || cred.issuerId,
    institutionId: cred.issuerId,
    institutionName: issuerName || cred.issuerId,
    status: mapStatus(cred.status),
    issuedAt: cred.issuedAt,
    revokedAt: cred.revokedAt,
    revokedReason:
      typeof metadata.revokedReason === 'string' ? metadata.revokedReason : undefined,
    blockchainTxHash: issueEvent?.txId,
    merkleRoot: cred.credentialHash,
    digitalSignature: undefined,
    templateId: undefined,
    metadata: {
      ...Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, String(v)]),
      ),
    },
  };
}

/** Backend lifecycle status -> shared CredentialStatus. */
function mapStatus(
  status: ApiCredential['status'] | ApiVerificationStatus,
): Credential['status'] {
  switch (status) {
    case 'ACTIVE':
    case 'ISSUED':
    case 'CREATED':
      return 'VALID';
    case 'REVOKED':
      return 'REVOKED';
    case 'SUSPENDED':
      return 'SUSPENDED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'REISSUED':
      return 'REVOKED';
    case 'INVALID':
      return 'INVALID';
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'UNVERIFIABLE':
      return 'INVALID';
    default:
      return 'INVALID';
  }
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

export async function getBackendHealth(): Promise<ApiHealth | null> {
  if (getDataSourceMode() === 'DEMO') return null;
  try {
    return await runWithRetry(() => fetchBlockchainAPI<ApiHealth>('/health'));
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
  const issuers = await runWithRetry(() => fetchBlockchainAPI<ApiIssuer[]>('/issuers'));
  return Promise.all(
    issuers.map(async (issuer) => {
      let count = 0;
      try {
        const history = await fetchBlockchainAPI<ApiIssuerHistory>(
          `/issuers/${encodeURIComponent(issuer.issuerId)}/history`,
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
}): Promise<ApiMutationReceipt> {
  const receipt = await runWithRetry(() =>
    fetchBlockchainAPI<ApiMutationReceipt>('/issuers', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    }),
  );
  return receipt;
}

export async function updateRealIssuer(
  issuerId: string,
  input: { name?: string; metadata?: Record<string, unknown> },
): Promise<ApiMutationReceipt> {
  return runWithRetry(() =>
    fetchBlockchainAPI<ApiMutationReceipt>(`/issuers/${encodeURIComponent(issuerId)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(input),
    }),
  );
}

/**
 * Admin issuer lifecycle backed by the real chain: suspends/activates an
 * issuer's on-chain status (backend-endpoint POST /issuers/:id/suspend|
 * activate). The backend independently authorizes the admin principal; the
 * frontend merely forwards the configured principal token.
 */
export async function suspendRealIssuer(
  issuerId: string,
  reason?: string,
): Promise<ApiMutationReceipt> {
  const receipt = await runWithRetry(() =>
    fetchBlockchainAPI<ApiMutationReceipt>(
      `/issuers/${encodeURIComponent(issuerId)}/suspend`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: reason ?? 'suspended by admin' }),
      },
    ),
  );
  if (!receipt.submitted) {
    throw new ApiError('The issuer suspension was rejected by the backend.', 400);
  }
  return receipt;
}

export async function activateRealIssuer(
  issuerId: string,
  reason?: string,
): Promise<ApiMutationReceipt> {
  const receipt = await runWithRetry(() =>
    fetchBlockchainAPI<ApiMutationReceipt>(
      `/issuers/${encodeURIComponent(issuerId)}/activate`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: reason ?? 'activated by admin' }),
      },
    ),
  );
  if (!receipt.submitted) {
    throw new ApiError('The issuer activation was rejected by the backend.', 400);
  }
  return receipt;
}

/**
 * The backend exposes issuer state via ISSUER_REGISTER / ISSUER_UPDATE
 * transactions only. An issuer's ACTIVE/SUSPENDED/REVOKED lifecycle is governed
 * by the chain; there is no dedicated "suspend issuer" lifecycle endpoint. We
 * therefore map Admin suspension onto the real state read (which reflects the
 * issuer's actual on-chain status) for display, and surface the backend state
 * honestly rather than inventing a mutation that does not exist.
 */
export async function getRealIssuer(id: string): Promise<Issuer> {
  const issuer = await runWithRetry(() =>
    fetchBlockchainAPI<ApiIssuer>(`/issuers/${encodeURIComponent(id)}`),
  );
  let count = 0;
  try {
    const history = await fetchBlockchainAPI<ApiIssuerHistory>(
      `/issuers/${encodeURIComponent(id)}/history`,
    );
    count = history.credentials.length;
  } catch {
    count = 0;
  }
  return mapApiIssuer(issuer, count);
}

export async function getRealIssuerHistory(id: string): Promise<ApiIssuerHistory> {
  return runWithRetry(() =>
    fetchBlockchainAPI<ApiIssuerHistory>(
      `/issuers/${encodeURIComponent(id)}/history`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Admin / Holder: Credential state (REAL backend)
// ---------------------------------------------------------------------------

/**
 * The SecureX ledger stores credential identifiers (public credentialId) but
 * carries no holder binding and exposes no "list all credentials" endpoint
 * (per-issuer history summaries omit the credentialId). To enumerate the
 * on-chain credential set for the holder wallet in REAL mode we probe the
 * public credential IDs the demo chain seeded (see backend scripts/demo-data.ts)
 * and keep only those the backend actually confirms as issued. Which of these a
 * given holder may see is decided by the OFF-CHAIN ownership registry.
 */
export { REAL_DEMO_CREDENTIAL_IDS };
export { REAL_DEMO_PUBLIC_CREDENTIAL_IDS };

/** Fetch the on-chain credential set confirmed by the real backend. */
export async function getRealCredentials(): Promise<Credential[]> {
  if (getDataSourceMode() === 'DEMO') {
    const { getCredentials } = await import('@/services/api/credentialService');
    return getCredentials();
  }
  const issuers = await runWithRetry(() => fetchBlockchainAPI<ApiIssuer[]>('/issuers'));
  const issuerName = new Map(issuers.map((i) => [i.issuerId, i.name]));

  const out: Credential[] = [];
  for (const id of REAL_DEMO_CREDENTIAL_IDS) {
    try {
      const cred = await fetchBlockchainAPI<ApiCredential>(
        `/credentials/${encodeURIComponent(id)}`,
      );
      out.push(mapApiCredential(cred, issuerName.get(cred.issuerId)));
    } catch {
      // credential not issued on this chain; skip it
    }
  }
  return out;
}

/**
 * The holder "My Credentials" view. In DEMO mode it preserves the Phase 1 mock
 * wallet (per-holder mock credentials). In REAL mode it shows only the on-chain
 * credentials the given holder actually owns (off-chain ownership registry),
 * so a holder never sees another holder's credentials.
 */
export async function getHolderCredentialsView(holderId: string): Promise<Credential[]> {
  if (getDataSourceMode() === 'DEMO') {
    const { getHolderCredentials } = await import('@/services/api/credentialService');
    return getHolderCredentials(holderId);
  }
  const ownedIds = getCredentialIdsForHolder(holderId);
  if (ownedIds.length === 0) return [];

  const issuerName = new Map(
    (await runWithRetry(() => fetchBlockchainAPI<ApiIssuer[]>('/issuers')))
      .map((i) => [i.issuerId, i.name]),
  );

  const out: Credential[] = [];
  for (const id of ownedIds) {
    try {
      const cred = await fetchBlockchainAPI<ApiCredential>(
        `/credentials/${encodeURIComponent(id)}`,
      );
      out.push(mapApiCredential(cred, issuerName.get(cred.issuerId)));
    } catch {
      // owned id not (yet) on-chain; skip it
    }
  }
  return out;
}

/**
 * Fetch a single credential for the given holder. Enforces holder access
 * control: a holder who does not own the credential receives an authorization
 * rejection (they cannot view another holder's credential).
 */
export async function getRealCredential(
  id: string,
  holderId?: string,
): Promise<Credential> {
  if (getDataSourceMode() === 'DEMO') {
    const { getCredentialById } = await import('@/services/api/credentialService');
    return getCredentialById(id);
  }
  if (holderId && !holderOwnsCredential(holderId, id)) {
    throw new ApiError(
      'You are not authorized to view this credential. It is not in your wallet.',
      403,
    );
  }
  const cred = await runWithRetry(() =>
    fetchBlockchainAPI<ApiCredential>(`/credentials/${encodeURIComponent(id)}`),
  );
  let issuerName: string | undefined;
  try {
    const issuer = await fetchBlockchainAPI<ApiIssuer>(
      `/issuers/${encodeURIComponent(cred.issuerId)}`,
    );
    issuerName = issuer.name;
  } catch {
    issuerName = undefined;
  }
  return mapApiCredential(cred, issuerName);
}

export async function getRealCredentialHistory(
  id: string,
): Promise<ApiCredentialHistoryEntry[]> {
  if (getDataSourceMode() === 'DEMO') return [];
  return runWithRetry(() =>
    fetchBlockchainAPI<ApiCredentialHistoryEntry[]>(
      `/credentials/${encodeURIComponent(id)}/history`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Credential lifecycle mutations (real transaction pipeline)
// ---------------------------------------------------------------------------
//
// These submit real lifecycle transactions to the backend's hardened V2
// validation path. IMPORTANT (verified against a live node): suspend on an
// ACTIVE credential is accepted via the anonymous/validator path and commits,
// but reinstate/revoke/reissue can be rejected with INVALID_SIGNATURE because
// the hardened path requires the *issuer's* signing key (V2), which a browser
// caller does not hold. Configure CTN_AUTH_TOKENS / a privileged shared-secret
// principal at the backend to authorize these in a secure deployment. The
// functions below surface backend rejections honestly (throw on submitted:false)
// rather than fabricating success.

export interface LifecycleInput {
  reason?: string;
}

async function lifecycleMutation(
  id: string,
  action: 'suspend' | 'reinstate' | 'revoke',
  input: LifecycleInput,
): Promise<ApiMutationReceipt> {
  const receipt = await runWithRetry(() =>
    fetchBlockchainAPI<ApiMutationReceipt>(
      `/credentials/${encodeURIComponent(id)}/${action}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ reason: input.reason ?? action }),
      },
    ),
  );
  if (!receipt.submitted) {
    throw new ApiError('The lifecycle transition was rejected by the backend.', 400);
  }
  return receipt;
}

export async function suspendRealCredential(
  id: string,
  reason?: string,
): Promise<ApiMutationReceipt> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return { submitted: true, id, type: 'CREDENTIAL_SUSPEND', sender: 'demo', nonce: 1, status: 'PENDING' };
  }
  return lifecycleMutation(id, 'suspend', { reason });
}

export async function reinstateRealCredential(
  id: string,
  reason?: string,
): Promise<ApiMutationReceipt> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return { submitted: true, id, type: 'CREDENTIAL_REINSTATE', sender: 'demo', nonce: 1, status: 'PENDING' };
  }
  return lifecycleMutation(id, 'reinstate', { reason });
}

export async function revokeRealCredential(
  id: string,
  reason?: string,
): Promise<ApiMutationReceipt> {
  if (getDataSourceMode() === 'DEMO') {
    const { revokeCredential } = await import('@/services/api/credentialService');
    await revokeCredential(id);
    return { submitted: true, id, type: 'CREDENTIAL_REVOKE', sender: 'demo', nonce: 1, status: 'PENDING' };
  }
  return lifecycleMutation(id, 'revoke', { reason });
}

export async function reissueRealCredential(
  id: string,
  input: {
    newCredentialId: string;
    newCredentialHash: string;
    reason?: string;
  },
): Promise<ApiMutationReceipt> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return { submitted: true, id, type: 'CREDENTIAL_REISSUE', sender: 'demo', nonce: 1, status: 'PENDING' };
  }
  const receipt = await runWithRetry(() =>
    fetchBlockchainAPI<ApiMutationReceipt>(
      `/credentials/${encodeURIComponent(id)}/reissue`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      },
    ),
  );
  if (!receipt.submitted) {
    throw new ApiError('The reissue was rejected by the backend.', 400);
  }
  return receipt;
}

// ---------------------------------------------------------------------------
// Verification (real backend verification service)
// ---------------------------------------------------------------------------

export interface VerificationView {
  status: ApiVerificationStatus;
  credentialId: string;
  credentialHash?: string;
  issuer?: { issuerId: string; name: string; publicKey: string; status: string };
  transaction?: { id: string; type: string; blockHeight: number; blockHash: string };
  block?: { height: number; hash: string; timestamp: string; proposer: string };
  issuerSignatureValid?: boolean;
  keyStatus?: string;
  protocolCompatible?: boolean;
  verifiedAt?: string;
  securityChecks?: Record<string, boolean>;
  documentHashCheck?: ApiVerifyResult['documentHashCheck'];
  message?: string;
}

function toVerificationView(result: ApiVerifyResult): VerificationView {
  return {
    status: result.status,
    credentialId: result.credentialId,
    credentialHash: result.credentialHash,
    issuer: result.issuer,
    transaction: result.transaction,
    block: result.block,
    issuerSignatureValid: result.issuerSignatureValid,
    keyStatus: result.keyStatus,
    protocolCompatible: result.protocolCompatible,
    verifiedAt: result.verifiedAt,
    securityChecks: result.securityChecks,
    documentHashCheck: result.documentHashCheck,
    message:
      result.status === 'NOT_FOUND'
        ? 'Credential not found on the SecureX ledger.'
        : result.errorMessage,
  };
}

export async function verifyRealCredential(
  credentialId: string,
  documentHash?: string,
): Promise<VerificationView> {
  if (getDataSourceMode() === 'DEMO') {
    const { verifyCredential } = await import('@/services/api/verificationService');
    const res = await verifyCredential(credentialId);
    return {
      status: res.status as ApiVerificationStatus,
      credentialId: res.credentialId,
      credentialHash: undefined,
      issuer: res.issuer
        ? {
            issuerId: res.issuer.name,
            name: res.issuer.name,
            publicKey: res.issuer.publicKey ?? '',
            status: res.issuer.verified ? 'ACTIVE' : 'UNKNOWN',
          }
        : undefined,
      verifiedAt: res.verifiedAt,
      securityChecks: {
        credentialExists: res.status !== 'NOT_FOUND',
        signatureValid: res.signatureVerification.valid,
      },
    };
  }
  const url = `/verify/${encodeURIComponent(credentialId)}`;
  const opts: RequestInit = documentHash
    ? { method: 'POST', headers: authHeaders(), body: JSON.stringify({ credentialId, documentHash }) }
    : {};
  const result = await runWithRetry(() => fetchBlockchainAPI<ApiVerifyResult>(url, opts));
  return toVerificationView(result);
}

/** DEMO fixed issuedAt (stable across renders so the demo QR is reproducible). */
const DEMO_QR_ISSUED_AT = 1780000000000;
/** DEMO fixed 64-byte (128 hex) Ed25519-shaped signature fixture. */
const DEMO_QR_SIGNATURE =
  'abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

export async function getRealQrReference(credentialId: string): Promise<ApiQrReference> {
  if (getDataSourceMode() === 'DEMO') {
    const publicId = resolveDemoPublicId(credentialId) ?? credentialId;
    const token = demoQrTokenForPublicId(publicId) ?? publicId;
    // DEMO QR content is opaque (no readable public ID): SXQR1.token.issuedAt.v1.sig
    const qrContent = `${SECUREX_QR_PREFIX}.${token}.${DEMO_QR_ISSUED_AT}.v1.${DEMO_QR_SIGNATURE}`;
    return {
      credentialId: publicId,
      version: '1',
      verificationUrl: `${window.location.origin}/verify/${encodeURIComponent(publicId)}`,
      payload: { credentialId: publicId, version: '1', protocol: SECUREX_QR_PREFIX },
      exists: true,
      qrContent,
    };
  }
  return runWithRetry(() =>
    fetchBlockchainAPI<ApiQrReference>(`/qr/${encodeURIComponent(credentialId)}`),
  );
}

export interface ApiQrVerify {
  ok: boolean;
  publicCredentialId?: string;
  reason?: string;
}

/**
 * REAL mode: forward an opaque SecureX QR payload to the backend for
 * authentication + resolution. The backend verifies the server Ed25519
 * signature, enforces the bounded lifetime, and resolves the opaque token to a
 * PUBLIC credential ID. On success returns the public ID (the backend response
 * never contains internal credential IDs).
 */
export async function verifyQrPayloadViaApi(payload: string): Promise<ApiQrVerify> {
  try {
    const result = await runWithRetry(() =>
      fetchBlockchainAPI<ApiVerifyResult>('/verify/qr', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ payload }),
      }),
    );
    if (result.status === 'NOT_FOUND') {
      return { ok: false, reason: 'Credential not found on the SecureX ledger.' };
    }
    return { ok: true, publicCredentialId: result.credentialId };
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'Could not authenticate this SecureX QR reference.';
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
  const idx = REAL_DEMO_CREDENTIAL_IDS.indexOf(internalId);
  return idx >= 0 ? REAL_DEMO_PUBLIC_CREDENTIAL_IDS[idx] : undefined;
}

// ---------------------------------------------------------------------------
// Audit / evidence
// ---------------------------------------------------------------------------

function toAuditView(event: ApiAuditEvent): AuditEvent {
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
 * Derive a display role for the audit actor. The backend authenticator does not
 * expose a frontend role in dev; we map the actor label to the closest shared
 * role for rendering only (the backend remains the authority on writes).
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
    fetchBlockchainAPI<ApiAuditEvent[]>(
      `/audit/events?limit=${limit}&offset=${offset}`,
      { headers: authHeaders() },
    ),
  );
  return events.map(toAuditView);
}

export async function getRealStateSummary(): Promise<ApiStateSummary | null> {
  if (getDataSourceMode() === 'DEMO') return null;
  try {
    return await runWithRetry(() => fetchBlockchainAPI<ApiStateSummary>('/state'));
  } catch {
    return null;
  }
}
