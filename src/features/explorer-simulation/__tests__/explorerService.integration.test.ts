import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api/client';
import type {
  ApiBlock,
  ApiValidator,
  ApiNetworkStatus,
  ApiHealth,
  ApiPeers,
} from '../types/backend';

// Integration-oriented tests for the REAL SecureX Blockchain V2 API mapping.
//
// These exercise the actual explorerService mapping logic (and the real
// requestJson client wrapper) against a stubbed global fetch, so they NEVER
// depend on a live production backend and do NOT invent any endpoints. The
// stub returns exactly the shapes the backend contract defines in
// src/features/explorer-simulation/types/backend.ts.

interface FakeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function jsonResponse(data: unknown, status = 200): FakeResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function fakeApi<T>(data: T, status = 200): FakeResponse {
  return jsonResponse({ success: true, data }, status);
}

let fetchMock: ReturnType<typeof vi.fn>;

async function loadRealService() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', 'false');
  const mod = await import('../services/explorerService');
  return mod;
}

async function loadDemoService() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', 'true');
  const mod = await import('../services/explorerService');
  return mod;
}

const sampleBlock: ApiBlock = {
  header: {
    version: 2,
    height: 42,
    timestamp: '2024-01-01T00:00:00.000Z',
    previousHash: 'prev-hash',
    merkleRoot: 'merkle-root',
    proposerId: 'val-01',
  },
  transactions: [
    {
      protocolVersion: '1.0',
      transactionVersion: 2,
      id: 'tx-1',
      type: 'CREDENTIAL_ISSUE',
      timestamp: '2024-01-01T00:00:01.000Z',
      sender: 'issuer-1',
      nonce: 7,
      payload: { subject: 'holder-1' },
      signature: 'signature-1',
    },
  ],
  validatorSignatures: [{ validatorId: 'val-01', signature: 'sig' }],
  hash: 'block-hash-42',
};

describe('explorerService real API integration', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('recognizes REAL vs DEMO mode from the architecture env flag', async () => {
    const real = await loadRealService();
    expect(real.getDataSourceMode()).toBe('REAL');

    const demo = await loadDemoService();
    expect(demo.getDataSourceMode()).toBe('DEMO');
  });

  it('maps a real block list response into explorer views with pagination metadata', async () => {
    const service = await loadRealService();
    const block2: ApiBlock = {
      ...sampleBlock,
      header: { ...sampleBlock.header, height: 41, previousHash: 'prev-2' },
      hash: 'block-hash-41',
    };
    fetchMock.mockResolvedValueOnce(fakeApi([sampleBlock, block2]));

    const page = await service.getExplorerBlocks(1, 10);

    // offset derived from page/size
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/blocks?offset=0&limit=10'), expect.anything());
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(10);
    expect(page.total).toBe(2);
    // two rows returned but limit is 10 -> no more pages
    expect(page.hasMore).toBe(false);

    const first = page.blocks[0]!;
    expect(first.height).toBe(42);
    expect(first.hash).toBe('block-hash-42');
    expect(first.previousHash).toBe('prev-hash');
    expect(first.merkleRoot).toBe('merkle-root');
    expect(first.proposerId).toBe('val-01');
    expect(first.version).toBe(2);
    expect(first.transactionCount).toBe(1);
    expect(first.transactions[0]!.id).toBe('tx-1');
    expect(first.transactions[0]!.type).toBe('CREDENTIAL_ISSUE');
    expect(first.transactions[0]!.sender).toBe('issuer-1');
    expect(first.transactions[0]!.nonce).toBe(7);
    expect(first.transactions[0]!.blockHeight).toBe(42);
  });

  it('reports hasMore when a full page of blocks is returned', async () => {
    const service = await loadRealService();
    const blocks = Array.from({ length: 10 }, (_, i) => ({
      ...sampleBlock,
      header: { ...sampleBlock.header, height: 42 - i },
    }));
    fetchMock.mockResolvedValueOnce(fakeApi(blocks));

    const page = await service.getExplorerBlocks(1, 10);
    expect(page.blocks).toHaveLength(10);
    expect(page.hasMore).toBe(true);
  });

  it('maps a single block by height using mapBlock', async () => {
    const service = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi(sampleBlock));

    const block = await service.getExplorerBlockByHeight(42);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/blocks/42'), expect.anything());
    expect(block.height).toBe(42);
    expect(block.transactions).toHaveLength(1);
    expect(block.transactions[0]!.blockHeight).toBe(42);
    expect(block.transactions[0]!.protocolVersion).toContain('/ v2');
  });

  it('maps a transaction record detail response', async () => {
    const service = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi({ transaction: sampleBlock.transactions[0], blockHeight: 42 }),
    );

    const tx = await service.getExplorerTransactionById('tx-1');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/transactions/tx-1'), expect.anything());
    expect(tx.id).toBe('tx-1');
    expect(tx.sender).toBe('issuer-1');
    expect(tx.nonce).toBe(7);
    expect(tx.blockHeight).toBe(42);
    expect(tx.type).toBe('CREDENTIAL_ISSUE');
  });

  it('aggregates the recent-transactions list from real blocks (no list endpoint exists)', async () => {
    const service = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi([sampleBlock]));

    const res = await service.getRecentTransactions(1, 12);
    // Aggregated from the real block payload — NOT an invented list endpoint.
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/blocks?offset=0'), expect.anything());
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0]!.id).toBe('tx-1');
    expect(res.transactions[0]!.blockHeight).toBe(42);
  });

  it('maps real validator records to the limited honest view', async () => {
    const service = await loadRealService();
    const validators: ApiValidator[] = [
      { validatorId: 'val-01', publicKey: 'pk-1', status: 'ACTIVE', addedAt: '2024-01-01T00:00:00.000Z' },
      { validatorId: 'val-02', publicKey: 'pk-2', status: 'INACTIVE', addedAt: '2024-01-02T00:00:00.000Z' },
    ];
    fetchMock.mockResolvedValueOnce(fakeApi(validators));

    const list = await service.getExplorerValidators();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/state/validators'), expect.anything());
    expect(list).toEqual([
      { id: 'val-01', publicKey: 'pk-1', active: true, addedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'val-02', publicKey: 'pk-2', active: false, addedAt: '2024-01-02T00:00:00.000Z' },
    ]);
  });

  it('maps real network status and falls back when metrics are unavailable', async () => {
    const service = await loadRealService();
    const status: ApiNetworkStatus = {
      nodeId: 'node-1',
      height: 100,
      peerCount: 3,
      validators: 5,
      currentProposer: 'val-01',
      pendingTransactions: 2,
      status: 'RUNNING',
    };
    fetchMock
      .mockResolvedValueOnce(fakeApi(status))
      .mockResolvedValueOnce(Promise.reject(new ApiError('metrics down', 0)));

    const net = await service.getExplorerNetworkStatus();
    expect(net.height).toBe(100);
    expect(net.peerCount).toBe(3);
    expect(net.validatorCount).toBe(5);
    // metrics rejected -> fall back to status.validators, protocol default
    expect(net.activeValidatorCount).toBe(5);
    expect(net.currentProposer).toBe('val-01');
    expect(net.protocolVersion).toBe('2.0');
    expect(net.nodeId).toBe('node-1');
    expect(net.status).toBe('RUNNING');
  });

  it('maps real peers response', async () => {
    const service = await loadRealService();
    const peers: ApiPeers = {
      connected: ['node-2'],
      known: [
        { nodeId: 'node-2', address: 'ws://node2:9000', lastSeen: '2024-01-01', isValidator: true },
      ],
      peerCount: 1,
    };
    fetchMock.mockResolvedValueOnce(fakeApi(peers));

    const result = await service.getExplorerPeers();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/network/peers'), expect.anything());
    expect(result.connected).toEqual(['node-2']);
    expect(result.peerCount).toBe(1);
  });

  it('maps real health response', async () => {
    const service = await loadRealService();
    const health: ApiHealth = {
      nodeId: 'node-1',
      version: 'v2.1.0',
      protocolVersion: '2.0',
      height: 100,
      peerCount: 3,
      uptime: 120,
      status: 'UP',
    };
    fetchMock.mockResolvedValueOnce(fakeApi(health));

    const result = await service.getExplorerHealth();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.anything());
    expect(result.status).toBe('UP');
    expect(result.height).toBe(100);
  });

  it('surfaces a 404 as an ApiError with status 404 (unknown height)', async () => {
    const service = await loadRealService();
    fetchMock.mockImplementation(async () =>
      jsonResponse({ success: false, error: 'Block not found' }, 404),
    );

    await expect(service.getExplorerBlockByHeight(9999)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Block not found',
    });
  });

  it('throws an ApiError status 0 when the network is unreachable', async () => {
    const service = await loadRealService();
    fetchMock.mockImplementation(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(service.getExplorerValidators()).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'Unable to reach the service. Please check your connection and try again.',
    });
  });

  it('rejects a successful-but-envelope-less response as malformed', async () => {
    const service = await loadRealService();
    // e.g. 2xx body that is not the {success,data} envelope
    fetchMock.mockImplementation(async () => jsonResponse({ raw: true }, 200));

    await expect(service.getExplorerValidators()).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
    });
  });

  it('retries transient failures then reports the final error', async () => {
    const service = await loadRealService();
    fetchMock
      .mockRejectedValueOnce(new TypeError('boom'))
      .mockRejectedValueOnce(new TypeError('boom'))
      .mockResolvedValueOnce(fakeApi(validatorsFixture()));

    const list = await service.getExplorerValidators();
    expect(list).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

function validatorsFixture(): ApiValidator[] {
  return [
    { validatorId: 'val-01', publicKey: 'pk-1', status: 'ACTIVE', addedAt: '2024-01-01T00:00:00.000Z' },
  ];
}