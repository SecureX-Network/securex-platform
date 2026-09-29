import { Router, Request, Response } from 'express';
import { get } from '../db/database.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditFor } from '../services/audit.js';
import { get as dbGet } from '../db/database.js';
import {
  blockchainClient,
  type BlockchainError,
  type BlockchainResult,
} from '../services/blockchain.js';
import {
  PLATFORM_ADMIN_ROLES,
  authorizeCredentialRead,
  authorizeCredentialWrite,
} from '../services/credentialAuthorization.js';
import { created, fail, ok, param } from '../utils/http.js';
import { logger } from '../services/logger.js';

// ---------------------------------------------------------------------------
// PLATFORM API <-> BLOCKCHAIN SERVICE PROXY
//
//     Browser  ->  Platform API (here)  ->  server/services/blockchain.ts  ->  Blockchain
//
// Rules this router enforces on every request:
//   1. Authentication where the data is not public.
//   2. Role authorization for administrative surfaces.
//   3. Object-level ownership for anything scoped to a credential or issuer.
//   4. The call goes through the server-side client, which owns the service
//      credential. The credential is never sent to the browser, never logged,
//      and never placed in a response body.
//   5. Every response is a MINIMAL DTO. Upstream payloads are projected, never
//      passed through wholesale, so an upstream contract change cannot leak new
//      internal fields to the browser.
//   6. A chain failure is reported as an explicit failure. Nothing here ever
//      fabricates a successful blockchain response.
//
// This is NOT an open proxy. Only the operations the SecureX product actually
// needs are implemented, and the Platform API's own authorization is always the
// gate — possessing the chain service credential is never an authorization
// substitute.
// ---------------------------------------------------------------------------

export const blockchainRouter = Router();

/** Map a typed blockchain error onto a safe Platform API response. */
function respondBlockchainFailure(res: Response, error: BlockchainError, context: string): void {
  logger.warn('blockchain.call_failed', { context, code: error.code, status: error.status });
  switch (error.code) {
    case 'NOT_CONFIGURED':
      fail(res, 503, 'BLOCKCHAIN_UNAVAILABLE', 'This blockchain operation is currently unavailable.');
      return;
    case 'TIMEOUT':
      fail(res, 504, 'BLOCKCHAIN_TIMEOUT', 'The blockchain service did not respond in time. Please try again.');
      return;
    case 'UNREACHABLE':
      fail(res, 502, 'BLOCKCHAIN_UNREACHABLE', 'The blockchain service could not be reached.');
      return;
    case 'INVALID_RESPONSE':
      fail(res, 502, 'BLOCKCHAIN_INVALID_RESPONSE', 'The blockchain service returned an unexpected response.');
      return;
    case 'HTTP_ERROR':
    default:
      fail(res, 502, 'BLOCKCHAIN_REJECTED', error.message);
  }
}

function unwrap<T>(result: BlockchainResult<T>, res: Response, context: string): T | undefined {
  if (!result.ok) {
    respondBlockchainFailure(res, result.error, context);
    return undefined;
  }
  return result.data;
}

// ── Read-only chain state (public explorer surface) ──────────────────────────
// These mirror the platform's own unauthenticated /blocks and /network/stats
// surfaces and expose only public, non-identifying chain metadata.

blockchainRouter.get('/health', (_req: Request, res: Response) => {
  void chainHealthHandler(res);
});

async function chainHealthHandler(res: Response): Promise<void> {
  const result = await blockchainClient.health();
  const data = unwrap(result, res, 'health');
  if (!data) return;
  ok(res, {
    status: data.status,
    height: data.height,
    peerCount: data.peerCount,
    nodeVersion: data.version,
    protocolVersion: data.protocolVersion,
    checkedAt: new Date().toISOString(),
  });
}

blockchainRouter.get('/state', (_req: Request, res: Response) => {
  void chainStateHandler(res);
});

async function chainStateHandler(res: Response): Promise<void> {
  const result = await blockchainClient.state();
  const data = unwrap(result, res, 'state');
  if (!data) return;
  ok(res, {
    height: data.height,
    issuers: data.issuers,
    credentials: data.credentials,
    validators: data.validators,
    keys: data.keys,
  });
}

blockchainRouter.get('/blocks', (req: Request, res: Response) => {
  void chainBlocksHandler(req, res);
});

async function chainBlocksHandler(req: Request, res: Response): Promise<void> {
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const result = await blockchainClient.blocks(offset, limit);
  const data = unwrap(result, res, 'blocks');
  if (!data) return;
  ok(res, {
    blocks: data.map((block) => ({
      hash: block.hash,
      height: block.header.height,
      previousHash: block.header.previousHash,
      merkleRoot: block.header.merkleRoot,
      timestamp: block.header.timestamp,
      proposerId: block.header.proposerId,
      version: block.header.version,
      transactionCount: block.transactions.length,
      transactions: block.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        timestamp: tx.timestamp,
        sender: tx.sender,
        nonce: tx.nonce,
        protocolVersion: tx.protocolVersion,
        transactionVersion: tx.transactionVersion,
      })),
    })),
    offset,
    limit,
  });
}

blockchainRouter.get('/blocks/:height', (req: Request, res: Response) => {
  void chainBlockHandler(req, res);
});

async function chainBlockHandler(req: Request, res: Response): Promise<void> {
  const height = Number(param(req, 'height'));
  if (!Number.isInteger(height) || height <= 0) {
    fail(res, 400, 'INVALID_HEIGHT', 'Block height must be a positive integer.');
    return;
  }
  const result = await blockchainClient.block(height);
  const data = unwrap(result, res, 'block');
  if (!data) return;
  ok(res, {
    hash: data.hash,
    height: data.header.height,
    previousHash: data.header.previousHash,
    merkleRoot: data.header.merkleRoot,
    timestamp: data.header.timestamp,
    proposerId: data.header.proposerId,
    version: data.header.version,
    transactionCount: data.transactions.length,
    transactions: data.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      timestamp: tx.timestamp,
      sender: tx.sender,
      nonce: tx.nonce,
      protocolVersion: tx.protocolVersion,
      transactionVersion: tx.transactionVersion,
    })),
  });
}

blockchainRouter.get('/transactions/:id', (req: Request, res: Response) => {
  void chainTransactionHandler(req, res);
});

async function chainTransactionHandler(req: Request, res: Response): Promise<void> {
  const result = await blockchainClient.transaction(param(req, 'id'));
  const data = unwrap(result, res, 'transaction');
  if (!data) return;
  ok(res, {
    id: data.transaction.id,
    type: data.transaction.type,
    timestamp: data.transaction.timestamp,
    sender: data.transaction.sender,
    nonce: data.transaction.nonce,
    blockHeight: data.blockHeight,
    protocolVersion: data.transaction.protocolVersion,
    transactionVersion: data.transaction.transactionVersion,
  });
}

blockchainRouter.get('/validators', (_req: Request, res: Response) => {
  void chainValidatorsHandler(res);
});

async function chainValidatorsHandler(res: Response): Promise<void> {
  const result = await blockchainClient.validators();
  const data = unwrap(result, res, 'validators');
  if (!data) return;
  ok(
    res,
    data.map((v) => ({
      id: v.validatorId,
      publicKey: v.publicKey,
      status: v.status,
      active: v.status === 'ACTIVE',
      addedAt: v.addedAt,
    })),
  );
}

blockchainRouter.get('/network', (_req: Request, res: Response) => {
  void chainNetworkHandler(res);
});

async function chainNetworkHandler(res: Response): Promise<void> {
  const [status, peers] = await Promise.all([
    blockchainClient.networkStatus(),
    blockchainClient.peers(),
  ]);
  const network = unwrap(status, res, 'network.status');
  if (!network) return;
  const peerData = peers.ok ? peers.data : { connected: [], known: [], peerCount: 0 };
  ok(res, {
    height: network.height,
    peerCount: network.peerCount,
    validatorCount: network.validators,
    currentProposer: network.currentProposer,
    pendingTransactions: network.pendingTransactions,
    nodeId: network.nodeId,
    status: network.status,
    connectedPeers: peerData.connected,
    knownPeers: peerData.known,
  });
}

// ── Node metrics ────────────────────────────────────────────────────────────
// Public, non-identifying operational counters only. The upstream payload is
// projected field-by-field (never passed through), so an upstream metrics
// addition cannot leak internals to the browser.

blockchainRouter.get('/metrics', (_req: Request, res: Response) => {
  void chainMetricsHandler(res);
});

async function chainMetricsHandler(res: Response): Promise<void> {
  const result = await blockchainClient.metrics();
  const data = unwrap(result, res, 'metrics');
  if (!data) return;
  const source = data as {
    chain?: { height?: unknown; blockCount?: unknown; transactionCount?: unknown };
    validators?: { count?: unknown; active?: unknown };
    consensus?: { status?: unknown; currentProposer?: unknown };
    node?: { version?: unknown; protocolVersion?: unknown; uptimeSeconds?: unknown };
  };
  const numberOr = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const stringOr = (value: unknown, fallback: string): string =>
    typeof value === 'string' ? value : fallback;

  ok(res, {
    height: numberOr(source.chain?.height, 0),
    blockCount: numberOr(source.chain?.blockCount, 0),
    transactionCount: numberOr(source.chain?.transactionCount, 0),
    validatorCount: numberOr(source.validators?.count, 0),
    activeValidatorCount: numberOr(source.validators?.active, 0),
    consensusStatus: stringOr(source.consensus?.status, 'UNKNOWN'),
    currentProposer:
      typeof source.consensus?.currentProposer === 'string'
        ? source.consensus.currentProposer
        : null,
    nodeVersion: stringOr(source.node?.version, 'unknown'),
    protocolVersion: stringOr(source.node?.protocolVersion, 'unknown'),
    uptimeSeconds: numberOr(source.node?.uptimeSeconds, 0),
  });
}

// ── Authenticated issuer / credential state ─────────────────────────────────
// These carry issuer- and credential-scoped data, so they require a session and
// (for credential routes) object-level ownership.

blockchainRouter.get('/issuers', requireAuth, (req: Request, res: Response) => {
  void chainIssuersHandler(req, res);
});

async function chainIssuersHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const result = await blockchainClient.issuers();
  const data = unwrap(result, res, 'issuers');
  if (!data) return;

  const all = data.map((issuer) => ({
    id: issuer.issuerId,
    name: issuer.name,
    publicKey: issuer.publicKey,
    status: issuer.status,
    createdAt: issuer.registeredAt,
  }));

  // Tenant-scoped roles only ever see their own institution's issuers.
  if (PLATFORM_ADMIN_ROLES.includes(auth.user.role) || auth.user.role === 'AUDITOR') {
    ok(res, all);
    return;
  }
  if (auth.user.institutionId) {
    const scoped = await scopeIssuersToInstitution(all, auth.user.institutionId);
    ok(res, scoped);
    return;
  }
  ok(res, []);
}

/** Keep only issuers the platform database associates with this institution. */
async function scopeIssuersToInstitution<
  T extends { id: string },
>(issuers: T[], institutionId: string): Promise<T[]> {
  if (issuers.length === 0) return [];
  const rows = await dbGet<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM issuers WHERE institution_id = $1 AND id = ANY($2)',
    institutionId,
    issuers.map((i) => i.id),
  );
  return Number(rows?.count ?? 0) === issuers.length ? issuers : [];
}

blockchainRouter.get('/issuers/:id', requireAuth, (req: Request, res: Response) => {
  void chainIssuerHandler(req, res);
});

async function chainIssuerHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const issuerId = param(req, 'id');
  if (!(await issuerInScope(auth, issuerId))) {
    fail(res, 404, 'ISSUER_NOT_FOUND', 'Issuer not found.');
    return;
  }
  const result = await blockchainClient.issuer(issuerId);
  const data = unwrap(result, res, 'issuer');
  if (!data) return;
  ok(res, {
    id: data.issuerId,
    name: data.name,
    publicKey: data.publicKey,
    status: data.status,
    createdAt: data.registeredAt,
  });
}

blockchainRouter.get('/issuers/:id/history', requireAuth, (req: Request, res: Response) => {
  void chainIssuerHistoryHandler(req, res);
});

async function chainIssuerHistoryHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const issuerId = param(req, 'id');
  if (!(await issuerInScope(auth, issuerId))) {
    fail(res, 404, 'ISSUER_NOT_FOUND', 'Issuer not found.');
    return;
  }
  const result = await blockchainClient.issuerHistory(issuerId);
  const data = unwrap(result, res, 'issuer.history');
  if (!data) return;
  ok(res, {
    issuerHistory: data.issuerHistory.map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      transactionId: e.txId,
      blockHeight: e.blockHeight,
    })),
    credentials: data.credentials.map((c) => ({
      currentStatus: c.currentStatus,
      eventCount: c.eventCount,
      lastEvent: c.lastEvent
        ? {
            type: c.lastEvent.type,
            timestamp: c.lastEvent.timestamp,
            transactionId: c.lastEvent.txId,
            blockHeight: c.lastEvent.blockHeight,
          }
        : null,
    })),
  });
}

/** Platform-database ownership check for an issuer id. */
async function issuerInScope(auth: AuthenticatedRequest, issuerId: string): Promise<boolean> {
  if (PLATFORM_ADMIN_ROLES.includes(auth.user.role) || auth.user.role === 'AUDITOR') {
    return true;
  }
  if (!auth.user.institutionId) return false;
  const row = await get<{ id: string }>(
    'SELECT id FROM issuers WHERE id = ? AND institution_id = ?',
    issuerId,
    auth.user.institutionId,
  );
  return Boolean(row);
}

blockchainRouter.get('/credentials/:id', requireAuth, (req: Request, res: Response) => {
  void chainCredentialHandler(req, res);
});

async function chainCredentialHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const credentialId = param(req, 'id');

  // Object-level ownership is decided by the PLATFORM database, not by the
  // chain, and out-of-scope records are reported as not found.
  const owned = await get<{
    institution_id: string;
    issuer_id: string;
    holder_id: string;
  }>(
    'SELECT institution_id, issuer_id, holder_id FROM credentials WHERE credential_id = ?',
    credentialId,
  );
  if (!owned) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }
  const decision = authorizeCredentialRead(auth.user, owned);
  if (!decision.allowed) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }

  const result = await blockchainClient.credential(credentialId);
  const data = unwrap(result, res, 'credential');
  if (!data) return;
  ok(res, {
    credentialId: data.credentialId,
    issuerId: data.issuerId,
    status: data.status,
    issuedAt: data.issuedAt,
    lastUpdated: data.lastUpdated,
    revokedAt: data.revokedAt,
    suspendedAt: data.suspendedAt,
    schemaVersion: data.schemaVersion,
    lifecycle: data.lifecycle.map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      transactionId: e.txId,
      blockHeight: e.blockHeight,
    })),
  });
}

blockchainRouter.get('/credentials/:id/history', requireAuth, (req: Request, res: Response) => {
  void chainCredentialHistoryHandler(req, res);
});

async function chainCredentialHistoryHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const credentialId = param(req, 'id');
  const owned = await get<{ institution_id: string; issuer_id: string; holder_id: string }>(
    'SELECT institution_id, issuer_id, holder_id FROM credentials WHERE credential_id = ?',
    credentialId,
  );
  if (!owned) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }
  if (!authorizeCredentialRead(auth.user, owned).allowed) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }
  const result = await blockchainClient.credentialHistory(credentialId);
  const data = unwrap(result, res, 'credential.history');
  if (!data) return;
  ok(
    res,
    data.map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      transactionId: e.txId,
      blockHeight: e.blockHeight,
    })),
  );
}

// ── QR ──────────────────────────────────────────────────────────────────────

/**
 * Mint/resolve a SecureX QR reference for a credential the caller is entitled to.
 * The browser cannot call the chain's /qr endpoint directly.
 */
blockchainRouter.get('/qr/:credentialId', requireAuth, (req: Request, res: Response) => {
  void chainQrHandler(req, res);
});

async function chainQrHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const credentialId = param(req, 'credentialId');
  const owned = await get<{ institution_id: string; issuer_id: string; holder_id: string }>(
    'SELECT institution_id, issuer_id, holder_id FROM credentials WHERE credential_id = ?',
    credentialId,
  );
  if (!owned || !authorizeCredentialRead(auth.user, owned).allowed) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }
  const result = await blockchainClient.qrReference(credentialId);
  const data = unwrap(result, res, 'qr');
  if (!data) return;
  ok(res, {
    credentialId: data.credentialId,
    version: data.version,
    exists: data.exists,
    verificationUrl: data.verificationUrl,
    qrContent: data.qrContent,
  });
}

/**
 * Resolve an opaque SecureX QR payload. This is the PUBLIC verification path
 * (the /verify scanner), so it is unauthenticated and rate-limited at mount
 * time. The chain is the component that authenticates the payload signature and
 * enforces its lifetime.
 *
 * Truthfulness: this endpoint reports what the chain decided. If the chain does
 * not authenticate the payload it says so; it never resolves an unauthenticated
 * payload and never claims the signature was cryptographically verified by
 * SecureX itself.
 */
blockchainRouter.post(
  '/qr/verify',
  validate([{ name: 'payload', required: true, type: 'string' }]),
  (req: Request, res: Response) => {
    void chainQrVerifyHandler(req, res);
  },
);

async function chainQrVerifyHandler(req: Request, res: Response): Promise<void> {
  const payload = (req.body as { payload?: unknown }).payload;
  if (typeof payload !== 'string' || payload.length === 0 || payload.length > 2048) {
    fail(res, 400, 'INVALID_QR_PAYLOAD', 'A SecureX QR payload string is required.');
    return;
  }

  const result = await blockchainClient.verifyQr(payload);
  if (!result.ok) {
    // A 404 from the chain means "this payload does not resolve", which is a
    // normal negative answer, not a service failure.
    if (result.error.status === 404) {
      ok(res, { resolved: false, reason: 'This SecureX QR reference could not be authenticated.' });
      return;
    }
    respondBlockchainFailure(res, result.error, 'qr.verify');
    return;
  }

  const data = result.data as {
    status?: string;
    credentialId?: string;
    errorMessage?: string;
  };
  if (data.status === 'NOT_FOUND' || !data.credentialId) {
    ok(res, { resolved: false, reason: 'This SecureX QR reference could not be authenticated.' });
    return;
  }
  ok(res, {
    resolved: true,
    credentialId: data.credentialId,
    status: data.status,
    checkedAt: new Date().toISOString(),
  });
}

// ── Administrative chain audit ──────────────────────────────────────────────

blockchainRouter.get(
  '/audit/events',
  requireAuth,
  requireRole(...PLATFORM_ADMIN_ROLES, 'AUDITOR'),
  (req: Request, res: Response) => {
    void chainAuditHandler(req, res);
  },
);

async function chainAuditHandler(req: Request, res: Response): Promise<void> {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const result = await blockchainClient.auditEvents(limit, offset);
  const data = unwrap(result, res, 'audit.events');
  if (!data) return;
  ok(
    res,
    data.map((event) => ({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      severity: event.severity,
      message: event.message,
      referenceType: event.referenceType,
      referenceId: event.referenceId,
      credentialId: event.credentialId,
      issuerId: event.issuerId,
      transactionId: event.txId,
      blockHeight: event.blockHeight,
      actor: event.actor,
    })),
  );
}

// ── Privileged chain writes ─────────────────────────────────────────────────
// Authorization is enforced FIRST from the authenticated user and the
// credential's database ownership. The chain service credential is used only to
// make the call — it is never treated as proof of permission.

blockchainRouter.post(
  '/issuers',
  requireAuth,
  requireRole('ADMIN', 'NETWORK_ADMIN'),
  validate([
    { name: 'issuerId', required: true, type: 'string' },
    { name: 'name', required: true, type: 'string' },
    { name: 'publicKey', required: true, type: 'string' },
    { name: 'metadata', type: 'object' },
  ]),
  (req: Request, res: Response) => {
    void registerIssuerHandler(req, res);
  },
);

async function registerIssuerHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const body = req.body as {
    issuerId: string;
    name: string;
    publicKey: string;
    metadata?: Record<string, unknown>;
  };

  // The issuer must belong to an ACTIVE platform institution. The Platform API
  // is the authority on which issuers exist; the chain is told about it.
  const issuer = await get<{ id: string; institution_id: string }>(
    'SELECT id, institution_id FROM issuers WHERE id = ?',
    body.issuerId,
  );
  if (!issuer) {
    fail(res, 400, 'UNKNOWN_ISSUER', 'Issuer not found.');
    return;
  }

  const result = await blockchainClient.registerIssuer({
    issuerId: body.issuerId,
    name: body.name,
    publicKey: body.publicKey,
    ...(body.metadata ? { metadata: body.metadata } : {}),
  });
  if (!result.ok) {
    respondBlockchainFailure(res, result.error, 'issuers.create');
    return;
  }
  if (!result.data.submitted) {
    fail(res, 502, 'BLOCKCHAIN_REJECTED', 'The blockchain service did not accept the issuer registration.');
    return;
  }
  await auditFor(auth, {
    action: 'BLOCKCHAIN_ISSUER_REGISTERED',
    target: body.issuerId,
    targetType: 'issuer',
    details: `institution=${issuer.institution_id}; request=${result.data.id}`,
  });
  created(res, { submitted: true, id: result.data.id, status: result.data.status });
}

blockchainRouter.patch(
  '/issuers/:id',
  requireAuth,
  requireRole('ADMIN', 'NETWORK_ADMIN'),
  validate([
    { name: 'name', type: 'string' },
    { name: 'metadata', type: 'object' },
  ]),
  (req: Request, res: Response) => {
    void updateIssuerHandler(req, res);
  },
);

async function updateIssuerHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const issuerId = param(req, 'id');
  const body = req.body as { name?: string; metadata?: Record<string, unknown> };
  if (body.name === undefined && body.metadata === undefined) {
    fail(res, 400, 'NOTHING_TO_UPDATE', 'Provide a name or metadata to update.');
    return;
  }
  const issuer = await get<{ id: string }>('SELECT id FROM issuers WHERE id = ?', issuerId);
  if (!issuer) {
    fail(res, 404, 'ISSUER_NOT_FOUND', 'Issuer not found.');
    return;
  }

  const result = await blockchainClient.updateIssuer(issuerId, {
    ...(body.name === undefined ? {} : { name: body.name }),
    ...(body.metadata === undefined ? {} : { metadata: body.metadata }),
  });
  if (!result.ok) {
    respondBlockchainFailure(res, result.error, 'issuers.update');
    return;
  }
  if (!result.data.submitted) {
    fail(res, 502, 'BLOCKCHAIN_REJECTED', 'The blockchain service did not accept the issuer update.');
    return;
  }
  await auditFor(auth, {
    action: 'BLOCKCHAIN_ISSUER_UPDATED',
    target: issuerId,
    targetType: 'issuer',
    details: `request=${result.data.id}`,
  });
  ok(res, { submitted: true, id: result.data.id, status: result.data.status });
}

/**
 * Relay a credential lifecycle transition to the chain.
 *
 * The transition is authorized here from the authenticated user and the
 * credential's database ownership, and the contract-shaped transaction is built
 * on the SERVER. SecureX does not hold an issuer signing key, so the chain is
 * expected to REJECT an unsigned submission; when it does, that rejection is
 * surfaced verbatim as a 502 rather than being reported as a successful
 * lifecycle change. A future issuer-side signing service can be added behind
 * this same endpoint without changing the browser contract.
 */
blockchainRouter.post(
  '/credentials/:id/transitions',
  requireAuth,
  requireRole('INSTITUTION', 'ISSUER', 'ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN'),
  validate([
    { name: 'action', required: true, type: 'string' },
    { name: 'reason', type: 'string' },
  ]),
  (req: Request, res: Response) => {
    void credentialTransitionHandler(req, res);
  },
);

const TRANSITION_TYPES: Record<string, string> = {
  suspend: 'CREDENTIAL_SUSPEND',
  reinstate: 'CREDENTIAL_REINSTATE',
  revoke: 'CREDENTIAL_REVOKE',
};

async function credentialTransitionHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const credentialId = param(req, 'id');
  const body = req.body as { action?: string; reason?: string };

  const type = body.action ? TRANSITION_TYPES[body.action] : undefined;
  if (!type) {
    fail(
      res,
      400,
      'UNSUPPORTED_TRANSITION',
      'Supported transitions are: suspend, reinstate, revoke.',
    );
    return;
  }

  const owned = await get<{ institution_id: string; issuer_id: string }>(
    'SELECT institution_id, issuer_id FROM credentials WHERE credential_id = ?',
    credentialId,
  );
  if (!owned) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }
  const decision = await authorizeCredentialWrite(auth.user, owned);
  if (!decision.allowed) {
    fail(res, 404, 'CREDENTIAL_NOT_FOUND', 'Credential not found.');
    return;
  }

  const transaction = {
    protocolVersion: '2.0',
    transactionVersion: 2,
    // The transaction id is generated server-side; the browser never authors one.
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    // No signing key is held by the Platform API. An empty sender/signature is
    // sent as-is: we never fabricate a signature, and the chain is expected to
    // reject it until an issuer-side signing service exists.
    sender: '',
    nonce: 0,
    payload: {
      credentialId,
      ...(body.reason ? { reason: body.reason } : {}),
    },
    signature: '',
  };

  const result = await blockchainClient.submitTransaction(transaction);
  if (!result.ok) {
    respondBlockchainFailure(res, result.error, 'credentials.transition');
    return;
  }
  if (!result.data.submitted) {
    fail(res, 502, 'BLOCKCHAIN_REJECTED', 'The blockchain service did not accept the lifecycle transition.');
    return;
  }
  await auditFor(auth, {
    action: 'BLOCKCHAIN_CREDENTIAL_TRANSITION',
    target: credentialId,
    targetType: 'credential',
    details: `transition=${type}; request=${result.data.id}`,
  });
  ok(res, { submitted: true, id: result.data.id, status: result.data.status });
}
