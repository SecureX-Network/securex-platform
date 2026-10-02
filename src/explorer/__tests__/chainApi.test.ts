import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Explorer's chain data access, exercised in REAL mode against a stubbed
 * `fetch`.
 *
 * These tests are the regression net for the Explorer's central promise: it
 * reads live chain data and nothing else. They assert that every read goes to
 * the Platform API's PUBLIC blockchain prefix, that the real chain's own
 * numbers (including a height of 0) are surfaced verbatim rather than being
 * smoothed into "activity", and that a failure produces an error rather than a
 * fallback value.
 *
 * The demo-mode guard is tested explicitly, because a public Explorer built in
 * DEMO mode is the one way this screen could ever show invented data.
 */

type Json = Record<string, unknown>;

/** The API origin the re-imported Explorer module is configured to call. */
const BASE = 'https://api-securex.sp-net.in/api';

function ok(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  } as unknown as Response;
}

function fail(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({ success: false, error: message, message }),
  } as unknown as Response;
}

const GENESIS_BLOCK: Json = {
  hash: '046ceea3024f4b82b5fcc73998105be92252a06e8cbeda0e5728609ca0ae2a87',
  height: 0,
  previousHash: '0'.repeat(64),
  merkleRoot: '0'.repeat(64),
  timestamp: '2026-01-01T00:00:00.000Z',
  proposerId: '',
  version: 1,
  transactionCount: 0,
  transactions: [],
};

const HEALTH: Json = {
  status: 'UP',
  height: 0,
  peerCount: 0,
  nodeVersion: '3.0.0',
  protocolVersion: '2.0',
  checkedAt: '2026-09-29T15:58:15.063Z',
};

const NETWORK: Json = {
  height: 0,
  peerCount: 0,
  validatorCount: 1,
  currentProposer: '260391c6e9d757227edff5e28f39c87beef9fcd7f74b69f92d5af2308700163c',
  pendingTransactions: 0,
  nodeId: '260391c6e9d757227edff5e28f39c87beef9fcd7f74b69f92d5af2308700163c',
  status: 'RUNNING',
  connectedPeers: [],
  knownPeers: [],
};

const METRICS: Json = {
  height: 0,
  blockCount: 1,
  transactionCount: 0,
  validatorCount: 1,
  activeValidatorCount: 1,
  consensusStatus: 'RUNNING',
  currentProposer: '260391c6e9d757227edff5e28f39c87beef9fcd7f74b69f92d5af2308700163c',
  nodeVersion: '3.0.0',
  protocolVersion: '2.0',
  uptimeSeconds: 1329,
};

const STATE: Json = {
  height: 0,
  issuers: 0,
  credentials: 0,
  validators: 1,
  keys: 0,
};

const VALIDATORS: Json[] = [
  {
    id: '260391c6e9d757227edff5e28f39c87beef9fcd7f74b69f92d5af2308700163c',
    publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA\n-----END PUBLIC KEY-----\n',
    status: 'ACTIVE',
    active: true,
    addedAt: '2026-01-01T00:00:00.000Z',
  },
];

/** The exact production responses for the current (empty) chain. */
function routeProductionApi(url: string): Response {
  const path = url.replace(`${BASE}`, '');
  if (path.startsWith('/blockchain/health')) return ok(HEALTH);
  if (path.startsWith('/blockchain/state')) return ok(STATE);
  if (path.startsWith('/blockchain/network')) return ok(NETWORK);
  if (path.startsWith('/blockchain/metrics')) return ok(METRICS);
  if (path.startsWith('/blockchain/validators')) return ok(VALIDATORS);
  if (path.startsWith('/blockchain/blocks?')) {
    return ok({ blocks: [GENESIS_BLOCK], offset: 0, limit: 10 });
  }
  if (/^\/blockchain\/blocks\/\d+$/.test(path)) {
    const height = Number(path.split('/').pop());
    if (height === 0) return ok(GENESIS_BLOCK);
    return fail(404, 'Block not found');
  }
  if (path.startsWith('/blockchain/transactions/')) {
    return fail(404, 'Transaction not found');
  }
  return fail(404, `No stub for ${path}`);
}

async function loadRealModule() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', 'false');
  vi.stubEnv('VITE_API_BASE_URL', 'https://api-securex.sp-net.in/api');
  return import('../services/chainApi');
}

describe('explorer chainApi (REAL mode)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => routeProductionApi(String(input)));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // ── Source of truth ───────────────────────────────────────────────────────

  it('reads node health straight from the chain, reporting height 0 verbatim', async () => {
    const { getChainHealth } = await loadRealModule();
    const health = await getChainHealth();

    // A height of 0 is a real, correct reading of this chain. It must not be
    // inflated into activity.
    expect(health.height).toBe(0);
    expect(health.peerCount).toBe(0);
    expect(health.status).toBe('UP');
    expect(health.nodeVersion).toBe('3.0.0');
    expect(health.protocolVersion).toBe('2.0');
  });

  it('only ever calls the public read-only blockchain prefix', async () => {
    const { getChainSummary } = await loadRealModule();
    await getChainSummary();

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith(`${BASE}/blockchain/`)).toBe(true);
    }
  });

  it('never touches the seeded PostgreSQL endpoints, even though they look plausible', async () => {
    const { getChainSummary, getBlocks, getRecentTransactions, getValidators, getPeers } =
      await loadRealModule();

    await getChainSummary();
    await getBlocks(1, 5);
    await getRecentTransactions(1, 5);
    await getValidators();
    await getPeers();

    // These three return synthetic rows written once by server/db/seed.ts
    // (22 blocks / 38 transactions) and hardcoded telemetry (nodesOnline: 42,
    // tps: 128). They are a real hazard precisely because they would render a
    // convincing page, so their exclusion is pinned explicitly rather than left
    // to the prefix check above.
    const excluded = ['/api/blocks', '/api/transactions', '/api/network/stats'];
    for (const call of fetchMock.mock.calls) {
      const url = String(call[0]);
      for (const path of excluded) {
        expect(url.includes(path), `${path} must never be used as chain state`).toBe(false);
      }
    }
  });

  it('never requests a write, admin, credential, issuer or QR endpoint', async () => {
    const { getChainSummary, getBlocks, getValidators } = await loadRealModule();
    await getChainSummary();
    await getBlocks(1, 5);
    await getValidators();

    const forbidden = [
      '/issuers',
      '/credentials',
      '/qr',
      '/audit',
      'POST',
      'PATCH',
      'PUT',
      'DELETE',
    ];
    for (const call of fetchMock.mock.calls) {
      const [url, init] = call as [string, RequestInit | undefined];
      expect(forbidden.some((token) => url.includes(token))).toBe(false);
      expect(init?.method ?? 'GET').toBe('GET');
    }
  });

  // ── Blocks ────────────────────────────────────────────────────────────────

  it('maps the genesis block with its real zeroed hashes and no proposer', async () => {
    const { getBlocks } = await loadRealModule();
    const page = await getBlocks(1, 10);

    expect(page.blocks).toHaveLength(1);
    const genesis = page.blocks[0]!;
    expect(genesis.height).toBe(0);
    expect(genesis.previousHash).toBe('0'.repeat(64));
    expect(genesis.proposerId).toBe('');
    expect(genesis.transactionCount).toBe(0);
    expect(genesis.transactions).toEqual([]);
  });

  it('derives hasMore from a full page rather than inventing a total', async () => {
    const { getBlocks } = await loadRealModule();
    // One block returned for a limit of 10 -> a short page -> no more pages.
    const partial = await getBlocks(1, 10);
    expect(partial.hasMore).toBe(false);
    expect(partial.total).toBe(1);

    // A page that comes back exactly full is the only "there may be more" signal.
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input).replace(`${BASE}`, '');
      if (path.startsWith('/blockchain/blocks?')) {
        return ok({
          blocks: Array.from({ length: 3 }, (_, i) => ({
            ...GENESIS_BLOCK,
            height: i,
            hash: `${i}`.repeat(64),
          })),
          offset: 0,
          limit: 3,
        });
      }
      return routeProductionApi(String(input));
    });

    const full = await getBlocks(1, 3);
    expect(full.hasMore).toBe(true);
  });

  it('surfaces a missing block as a not-found, not a fallback block', async () => {
    const { getBlockByHeight, NotFoundError } = await loadRealModule();
    await expect(getBlockByHeight(9)).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── Transactions ──────────────────────────────────────────────────────────

  it('returns an empty transaction list for a chain with no transactions', async () => {
    const { getRecentTransactions } = await loadRealModule();
    const result = await getRecentTransactions(1, 12);

    expect(result.transactions).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('compiles the transaction list from real block contents', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input).replace(`${BASE}`, '');
      if (path.startsWith('/blockchain/blocks?')) {
        return ok({
          blocks: [
            {
              ...GENESIS_BLOCK,
              height: 2,
              hash: 'a'.repeat(64),
              transactionCount: 1,
              transactions: [
                {
                  id: 'tx-real-1',
                  type: 'CREDENTIAL_ISSUED',
                  timestamp: '2026-09-29T10:00:00.000Z',
                  sender: 'sender-1',
                  nonce: 1,
                  protocolVersion: '2.0',
                  transactionVersion: 1,
                },
              ],
            },
          ],
          offset: 0,
          limit: 25,
        });
      }
      return routeProductionApi(String(input));
    });

    const { getRecentTransactions } = await loadRealModule();
    const result = await getRecentTransactions(1, 12);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]!.id).toBe('tx-real-1');
    // Block height is carried through so the transaction can link to its block.
    expect(result.transactions[0]!.blockHeight).toBe(2);
  });

  // ── Validators ────────────────────────────────────────────────────────────

  it('exposes only public validator identity fields', async () => {
    const { getValidators } = await loadRealModule();
    const validators = await getValidators();

    expect(validators).toHaveLength(1);
    expect(Object.keys(validators[0]!).sort()).toEqual(
      ['active', 'addedAt', 'id', 'publicKey'].sort(),
    );
    expect(validators[0]!.active).toBe(true);
  });

  // ── Network / metrics ─────────────────────────────────────────────────────

  it('reports a single-node network honestly', async () => {
    const { getChainSummary, getPeers } = await loadRealModule();

    const summary = await getChainSummary();
    expect(summary.network?.peerCount).toBe(0);
    expect(summary.network?.validatorCount).toBe(1);
    expect(summary.network?.status).toBe('RUNNING');
    expect(summary.metrics?.transactionCount).toBe(0);
    expect(summary.state?.validators).toBe(1);

    const peers = await getPeers();
    expect(peers.peerCount).toBe(0);
    expect(peers.connected).toEqual([]);
  });

  it('reports the node and protocol versions the node actually reports', async () => {
    const { getNetworkStatus } = await loadRealModule();
    const status = await getNetworkStatus();
    expect(status.nodeVersion).toBe('3.0.0');
    expect(status.protocolVersion).toBe('2.0');
    expect(status.activeValidatorCount).toBe(1);
  });

  // ── Failure handling ──────────────────────────────────────────────────────

  it('surfaces an unavailable chain as an error instead of substituting data', async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error('network down');
    });

    const { getChainHealth } = await loadRealModule();
    await expect(getChainHealth()).rejects.toBeDefined();
  });

  it('surfaces a transient failure after one attempt, for the ladder to retry', async () => {
    // The Platform API already retries a sleeping node for ~40s before returning
    // a definitive 502, so retrying again here only multiplied a 45s request
    // into a 149s cycle and piled more requests onto a struggling free-tier
    // instance. Recovery belongs to the bounded ladder in `useChainResource`,
    // which backs off, is capped, and pauses on a hidden tab.
    let attempts = 0;
    fetchMock.mockImplementation(async () => {
      attempts += 1;
      return fail(503, 'Blockchain service unavailable');
    });

    const { getChainHealth } = await loadRealModule();

    await expect(getChainHealth()).rejects.toBeDefined();
    expect(attempts).toBe(1);

    // And the failure is recognisable as the node being asleep, so the ladder
    // knows it is worth retrying quickly rather than backing off for minutes.
    const { isTransientChainError } = await loadRealModule();
    await getChainHealth().catch((e: unknown) => {
      expect(isTransientChainError(e)).toBe(true);
    });
  });

  it('reports a transient failure without inventing data', async () => {
    fetchMock.mockImplementation(async () => fail(502, 'BLOCKCHAIN_UNREACHABLE'));

    const { getChainSummary } = await loadRealModule();

    // Health gates the summary, so an unreachable node costs exactly one
    // request rather than fanning out to four.
    await expect(getChainSummary()).rejects.toBeDefined();
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  it('does not retry a 404 — a missing record is a real answer', async () => {
    let attempts = 0;
    fetchMock.mockImplementation(async () => {
      attempts += 1;
      return fail(404, 'Block not found');
    });

    const { getBlockByHeight } = await loadRealModule();
    await expect(getBlockByHeight(4)).rejects.toBeDefined();
    expect(attempts).toBe(1);
  });

  it('degrades gracefully when only metrics is unavailable', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes('/blockchain/metrics')) {
        return fail(500, 'metrics exploded');
      }
      return routeProductionApi(String(input));
    });

    const { getChainSummary } = await loadRealModule();
    const summary = await getChainSummary();

    // Health/network/state still resolve; metrics is simply absent rather than
    // being backfilled with a plausible-looking number.
    expect(summary.health?.status).toBe('UP');
    expect(summary.network?.status).toBe('RUNNING');
    expect(summary.metrics).toBeNull();
  });

  // ── Demo-mode guard ───────────────────────────────────────────────────────

  it('refuses to serve data from a DEMO-mode build', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK', 'true');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api-securex.sp-net.in/api');
    const { getChainHealth, assertRealMode, ChainUnavailableError } = await import(
      '../services/chainApi'
    );

    expect(() => assertRealMode()).toThrow(ChainUnavailableError);
    // The guard fires before any request is made: a demo build cannot quietly
    // fall back to fixtures.
    await expect(getChainHealth()).rejects.toBeInstanceOf(ChainUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── Search ────────────────────────────────────────────────────────────────

  it('routes a numeric query to a block height and anything else to a transaction id', async () => {
    const { classifySearchQuery } = await loadRealModule();

    expect(classifySearchQuery('0')).toEqual({ kind: 'block', height: 0 });
    expect(classifySearchQuery(' 42 ')).toEqual({ kind: 'block', height: 42 });
    expect(classifySearchQuery('tx-abc')).toEqual({ kind: 'transaction', id: 'tx-abc' });
    // No block-hash lookup endpoint exists, so a hash is not claimed as a block.
    expect(classifySearchQuery('a'.repeat(64))).toEqual({
      kind: 'transaction',
      id: 'a'.repeat(64),
    });
  });
});
