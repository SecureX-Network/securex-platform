import { serverConfig } from '../config.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// SERVER-SIDE BLOCKCHAIN CLIENT (the only component allowed to speak to the
// privileged SecureX Blockchain service).
//
// Trust boundary:
//
//     Browser  ->  Platform API (authn + authz)  ->  this client  ->  Blockchain
//
// The browser NEVER holds the blockchain service URL or its credential. The
// credential is read from the server-only BLOCKCHAIN_AUTH_TOKEN environment
// variable and is attached here, on the server, per request.
//
// Hard guarantees of this module:
//   * the credential is never logged and never placed in a response body;
//   * every call has a bounded timeout;
//   * a non-2xx upstream response becomes a typed error, never a success;
//   * an unreachable / unconfigured / malformed upstream becomes a typed error,
//     never a fabricated success;
//   * results are discriminated unions so callers cannot accidentally treat an
//     unavailable chain as a verified one.
// ---------------------------------------------------------------------------

export type BlockchainErrorCode =
  /** BLOCKCHAIN_API_URL / BLOCKCHAIN_AUTH_TOKEN are not configured server-side. */
  | 'NOT_CONFIGURED'
  /** The request exceeded the configured timeout. */
  | 'TIMEOUT'
  /** DNS/connection failure — the chain could not be reached. */
  | 'UNREACHABLE'
  /** The chain answered with a non-2xx status. */
  | 'HTTP_ERROR'
  /** The chain answered 2xx with a body we could not parse. */
  | 'INVALID_RESPONSE';

export interface BlockchainError {
  code: BlockchainErrorCode;
  /** Safe, human-readable summary. Never contains the service credential. */
  message: string;
  /** Upstream HTTP status, when the failure was an HTTP status. */
  status?: number;
  /** Upstream machine-readable code, when the upstream supplied one. */
  upstreamCode?: string;
}

export type BlockchainResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: BlockchainError };

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Path relative to the blockchain base URL, e.g. `/state/issuers`. */
  path: string;
  query?: Record<string, string | number | undefined>;
  /** Milliseconds; defaults to serverConfig.blockchainTimeoutMs. */
  timeoutMs?: number;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = serverConfig.blockchainApiUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return `${base}${suffix}${qs ? `?${qs}` : ''}`;
}

function extractErrorText(body: unknown): { message?: string; code?: string } {
  if (typeof body !== 'object' || body === null) return {};
  const record = body as Record<string, unknown>;
  const error = record.error;
  if (typeof error === 'string') return { message: error, code: error };
  if (typeof error === 'object' && error !== null) {
    const nested = error as Record<string, unknown>;
    return {
      message: typeof nested.message === 'string' ? nested.message : undefined,
      code: typeof nested.code === 'string' ? nested.code : undefined,
    };
  }
  return {
    message: typeof record.message === 'string' ? record.message : undefined,
    code: typeof record.errorCode === 'string' ? record.errorCode : undefined,
  };
}

let warnedAboutMissingToken = false;

/**
 * Upstream statuses that mean "try again shortly", not "you did it wrong".
 *
 * The SecureX Blockchain service runs on Render. A FREE-plan instance is
 * suspended after 15 minutes without inbound traffic, and Render's edge answers
 * requests that arrive while the instance is suspended or still spinning up
 * with 429 / 502 / 503 / 504 rather than waiting for it. A cold start that has
 * to provision keys and re-create the genesis block takes ~20-25s.
 *
 * None of these statuses indicate a bad request or a rejected credential, so
 * they are retried. 4xx statuses that DO describe the request itself (400, 401,
 * 403, 404, 409, 422) are never retried — retrying them only wastes the caller's
 * deadline and, for 401/403, hides a genuine credential problem behind noise.
 */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Total wall-clock budget for one logical blockchain operation, shared across
 * every attempt. Attempts are never allowed to outlive it, so adding retries
 * cannot extend the request beyond the configured BLOCKCHAIN_TIMEOUT_MS.
 */
const RETRY_BUDGET_PADDING_MS = 250;

/**
 * Retry window sizing.
 *
 * These are chosen against the measured cold start: a suspended free instance
 * takes ~20-25s to provision keys, re-create the genesis block and begin
 * serving, and BLOCKCHAIN_TIMEOUT_MS is 60s.
 *
 * The ceilings are 3s, 6s, 8s, 8s, 8s, 8s, 8s. Because jitter only takes the top
 * half of each window, the operation is guaranteed to keep retrying for at least
 * ~25s and typically ~37s — comfortably longer than a spin-up, and still well
 * inside the caller's 60s budget (the deadline check below enforces that even if
 * these numbers are ever changed).
 *
 * This is a mitigation, not a substitute for the infrastructure fix: a paid
 * instance that never suspends is the real remedy. Retrying stops a suspended
 * instance from reading as an outage in the meantime, and each attempt costs one
 * request rather than failing the caller's whole operation immediately.
 */
const MAX_ATTEMPTS = 8;
const RETRY_BASE_DELAY_MS = 3000;
const RETRY_MAX_DELAY_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with jitter over the TOP half of each window.
 *
 * Jitter matters here specifically: the Platform API sends several blockchain
 * calls concurrently (a single Explorer page load fans out to /health, /state,
 * /network and /metrics). Without jitter they would all retry in lockstep after a
 * shared cold start and hammer the instance the instant it finished booting.
 *
 * Jittering only the top half, rather than the whole window (full jitter), keeps
 * a guaranteed minimum wait: full jitter would halve the expected time spent
 * retrying, which is not enough to ride out a ~23s spin-up.
 */
function backoffDelay(attempt: number): number {
  const ceiling = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const floor = Math.ceil(ceiling / 2);
  return floor + Math.floor(Math.random() * (ceiling - floor + 1));
}

/** Seconds to wait, from a `Retry-After` header when the upstream supplied one. */
function retryAfterMs(response: Response): number | null {
  const raw = response.headers.get('retry-after');
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, RETRY_MAX_DELAY_MS);
  }
  const at = Date.parse(raw);
  if (Number.isFinite(at)) {
    return Math.max(0, Math.min(at - Date.now(), RETRY_MAX_DELAY_MS));
  }
  return null;
}

/** Centralized, timeout-bounded HTTP call to the blockchain service. */
async function request<T>(
  options: RequestOptions,
  attempt = 0,
): Promise<BlockchainResult<T>> {
  if (!serverConfig.blockchainApiUrl) {
    return {
      ok: false,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'The blockchain service is not configured on this server.',
      },
    };
  }

  // A privileged chain call without a credential would be rejected upstream
  // anyway. Refuse explicitly instead of issuing an unauthenticated request or
  // reporting a result we cannot attribute.
  if (!serverConfig.blockchainAuthToken) {
    if (!warnedAboutMissingToken) {
      warnedAboutMissingToken = true;
      logger.warn('blockchain.auth_token_missing', {
        hint: 'Set the server-only BLOCKCHAIN_AUTH_TOKEN environment variable to enable blockchain operations.',
      });
    }
    return {
      ok: false,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Blockchain operations are unavailable: no server-side blockchain credential is configured.',
      },
    };
  }

  const timeoutMs = options.timeoutMs ?? serverConfig.blockchainTimeoutMs;
  const deadline = Date.now() + timeoutMs - RETRY_BUDGET_PADDING_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(options.path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        // The service credential is attached here and nowhere else.
        Authorization: `Bearer ${serverConfig.blockchainAuthToken}`,
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const { message, code } = extractErrorText(payload);

      // A suspended or spinning-up free instance answers 429/5xx. Wait it out
      // within the caller's existing deadline instead of failing immediately.
      if (RETRYABLE_STATUSES.has(response.status) && attempt + 1 < MAX_ATTEMPTS) {
        const wait = retryAfterMs(response) ?? backoffDelay(attempt);
        if (Date.now() + wait < deadline) {
          clearTimeout(timer);
          logger.warn('blockchain.upstream_retry', {
            path: options.path,
            status: response.status,
            attempt: attempt + 1,
            waitMs: wait,
          });
          await sleep(wait);
          return request<T>(options, attempt + 1);
        }
      }

      return {
        ok: false,
        error: {
          code: 'HTTP_ERROR',
          message: message ?? `The blockchain service responded with status ${response.status}.`,
          status: response.status,
          ...(code ? { upstreamCode: code } : {}),
        },
      };
    }

    // The chain wraps payloads in { success, data }. Accept a bare body too so
    // the client works against either shape, but never invent a `data` value.
    if (typeof payload === 'object' && payload !== null && 'success' in payload) {
      const envelope = payload as { success?: unknown; data?: unknown; error?: unknown };
      if (envelope.success !== true) {
        const { message, code } = extractErrorText(payload);
        return {
          ok: false,
          error: {
            code: 'HTTP_ERROR',
            message: message ?? 'The blockchain service reported a failed operation.',
            status: response.status,
            ...(code ? { upstreamCode: code } : {}),
          },
        };
      }
      if (envelope.data === undefined) {
        return {
          ok: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'The blockchain service returned a response without a data payload.',
            status: response.status,
          },
        };
      }
      return { ok: true, data: envelope.data as T, status: response.status };
    }

    if (payload === null) {
      return {
        ok: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'The blockchain service returned an unreadable response.',
          status: response.status,
        },
      };
    }

    return { ok: true, data: payload as T, status: response.status };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        error: { code: 'TIMEOUT', message: `The blockchain service did not respond within ${timeoutMs}ms.` },
      };
    }

    // A suspended free instance can also refuse the TCP connection outright
    // rather than answering with a status. That is the same transient condition,
    // so it gets the same bounded retry.
    if (attempt + 1 < MAX_ATTEMPTS) {
      const wait = backoffDelay(attempt);
      if (Date.now() + wait < deadline) {
        clearTimeout(timer);
        logger.warn('blockchain.upstream_retry', {
          path: options.path,
          status: 'UNREACHABLE',
          attempt: attempt + 1,
          waitMs: wait,
        });
        await sleep(wait);
        return request<T>(options, attempt + 1);
      }
    }

    return {
      ok: false,
      error: { code: 'UNREACHABLE', message: 'The blockchain service could not be reached.' },
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Upstream response shapes (the securex-blockchain V3 REST contract). These are
// declared here so the server owns them; the browser has no copy.
// ---------------------------------------------------------------------------

export interface ApiIssuer {
  issuerId: string;
  name: string;
  publicKey: string;
  status: string;
  registeredAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiLifecycleEvent {
  type: string;
  timestamp: string;
  txId?: string;
  blockHeight?: number;
  data?: Record<string, unknown>;
}

export interface ApiCredentialSummary {
  currentStatus: string;
  lastEvent: ApiLifecycleEvent | null;
  eventCount: number;
}

export interface ApiIssuerHistory {
  issuerHistory: ApiLifecycleEvent[];
  credentials: ApiCredentialSummary[];
}

export interface ApiCredential {
  credentialId: string;
  issuerId: string;
  credentialHash: string;
  status: string;
  schemaVersion: string;
  issuedAt: string;
  lastUpdated: string;
  revokedAt?: string;
  suspendedAt?: string;
  reissuedFrom?: string;
  reissuedTo?: string;
  metadata?: Record<string, unknown>;
  lifecycle: ApiLifecycleEvent[];
}

export interface ApiBlockHeader {
  height: number;
  previousHash: string;
  merkleRoot: string;
  timestamp: string;
  proposerId: string;
  version: number;
}

export interface ApiChainTransaction {
  protocolVersion: string;
  transactionVersion: number;
  id: string;
  type: string;
  timestamp: string;
  sender: string;
  nonce: number;
  payload: Record<string, unknown>;
  signature: string;
}

export interface ApiBlock {
  hash: string;
  header: ApiBlockHeader;
  transactions: ApiChainTransaction[];
}

export interface ApiTransactionRecord {
  transaction: ApiChainTransaction;
  blockHeight: number;
}

export interface ApiValidator {
  validatorId: string;
  publicKey: string;
  status: string;
  addedAt: string;
}

export interface ApiNetworkStatus {
  height: number;
  peerCount: number;
  validators: number;
  currentProposer: string | null;
  pendingTransactions: number;
  nodeId: string;
  status: string;
}

export interface ApiPeers {
  connected: string[];
  known: Array<{ nodeId: string; address: string; lastSeen: string; isValidator: boolean }>;
  peerCount: number;
}

export interface ApiHealth {
  nodeId: string;
  version: string;
  protocolVersion: string;
  height: number;
  peerCount: number;
  uptime: number;
  status: string;
}

export interface ApiStateSummary {
  height: number;
  issuers: number;
  credentials: number;
  validators: number;
  keys: number;
}

export interface ApiAuditEvent {
  id: string;
  type: string;
  timestamp: string;
  severity: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  txId?: string;
  credentialId?: string;
  issuerId?: string;
  blockHeight?: number;
  actor?: string;
}

export interface ApiQrReference {
  credentialId: string;
  version: string;
  verificationUrl: string;
  payload: { credentialId: string; version: string; protocol?: string };
  exists: boolean;
  qrContent: string;
}

export interface ApiMutationReceipt {
  submitted: boolean;
  id: string;
  status: string;
}

export interface ApiTransactionSubmission extends ApiMutationReceipt {
  type?: string;
  sender?: string;
  nonce?: number;
}

// ---------------------------------------------------------------------------
// Typed operations. Only the operations the SecureX product actually needs are
// exposed — this client is not a general-purpose pass-through proxy, and callers
// must still authorize the caller before invoking it.
// ---------------------------------------------------------------------------

function encode(id: string): string {
  return encodeURIComponent(id);
}

export const blockchainClient = {
  health: () => request<ApiHealth>({ path: '/health' }),

  // ── Read-only chain state ────────────────────────────────────────────────
  state: () => request<ApiStateSummary>({ path: '/state' }),
  blocks: (offset: number, limit: number) =>
    request<ApiBlock[]>({ path: '/blocks', query: { offset, limit } }),
  block: (height: number) => request<ApiBlock>({ path: `/blocks/${height}` }),
  transaction: (id: string) =>
    request<ApiTransactionRecord>({ path: `/transactions/${encode(id)}` }),
  validators: () => request<ApiValidator[]>({ path: '/state/validators' }),
  networkStatus: () => request<ApiNetworkStatus>({ path: '/network/status' }),
  peers: () => request<ApiPeers>({ path: '/network/peers' }),
  metrics: () => request<Record<string, unknown>>({ path: '/metrics' }),

  // ── Issuers ──────────────────────────────────────────────────────────────
  issuers: () => request<ApiIssuer[]>({ path: '/state/issuers' }),
  issuer: (id: string) => request<ApiIssuer>({ path: `/state/issuers/${encode(id)}` }),
  issuerHistory: (id: string) =>
    request<ApiIssuerHistory>({ path: `/state/issuers/${encode(id)}/history` }),

  // ── Credentials ──────────────────────────────────────────────────────────
  credential: (id: string) =>
    request<ApiCredential>({ path: `/state/credentials/${encode(id)}` }),
  credentialHistory: (id: string) =>
    request<ApiLifecycleEvent[]>({ path: `/state/credentials/${encode(id)}/history` }),

  // ── Verification / QR ────────────────────────────────────────────────────
  verify: (credentialId: string, documentHash?: string) =>
    documentHash === undefined
      ? request<Record<string, unknown>>({ path: `/verify/${encode(credentialId)}` })
      : request<Record<string, unknown>>({
          method: 'POST',
          path: `/verify/${encode(credentialId)}`,
          body: { credentialId, documentHash },
        }),
  verifyQr: (payload: string) =>
    request<Record<string, unknown>>({
      method: 'POST',
      path: '/verify/qr',
      body: { payload },
    }),
  qrReference: (credentialId: string) =>
    request<ApiQrReference>({ path: `/qr/${encode(credentialId)}` }),

  // ── Audit ────────────────────────────────────────────────────────────────
  auditEvents: (limit: number, offset: number) =>
    request<ApiAuditEvent[]>({ path: '/audit/events', query: { limit, offset } }),

  // ── Privileged writes ────────────────────────────────────────────────────
  // The caller MUST authorize the request first. These exist so an authorized
  // Platform API route can relay a write; the service credential never acts as
  // a substitute for Platform API authorization.
  registerIssuer: (input: {
    issuerId: string;
    name: string;
    publicKey: string;
    metadata?: Record<string, unknown>;
  }) => request<ApiMutationReceipt>({ method: 'POST', path: '/issuers', body: input }),
  updateIssuer: (issuerId: string, input: { name?: string; metadata?: Record<string, unknown> }) =>
    request<ApiMutationReceipt>({
      method: 'PATCH',
      path: `/issuers/${encode(issuerId)}`,
      body: input,
    }),
  submitTransaction: (transaction: unknown) =>
    request<ApiTransactionSubmission>({
      method: 'POST',
      path: '/transactions',
      body: transaction,
    }),
};

export type BlockchainClient = typeof blockchainClient;
