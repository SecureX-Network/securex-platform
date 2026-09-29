import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api/client';
import { API_BASE_URL } from '@/constants';
import type {
  ChainBlockDto,
  ChainBlockPageDto,
  ChainHealthDto,
  ChainMetricsDto,
  ChainNetworkDto,
  ChainTransactionDto,
  ChainTransactionRecordDto,
  ChainValidatorDto,
} from '@/services/api/blockchainProxy';

// Integration-oriented tests for the REAL explorer mapping.
//
// The browser never addresses the blockchain service: every read goes through
// the SecureX Platform API's blockchain proxy (/api/blockchain/*), which holds
// the service credential server-side. These tests exercise the real
// explorerService mapping and the real requestJson client wrapper against a
// stubbed global fetch, so they NEVER depend on a live service and do NOT
// invent any endpoints. The stub returns exactly the projections declared in
// src/services/api/blockchainProxy.ts.

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

/** The url passed to fetch for the nth call. */
function callUrl(index: number): string {
  return String(fetchMock.mock.calls[index]![0]);
}

const sampleTransaction: ChainTransactionDto = {
  id: 'tx-1',
  type: 'CREDENTIAL_ISSUE',
  timestamp: '2024-01-01T00:00:01.000Z',
  sender: 'issuer-1',
  nonce: 7,
  protocolVersion: '1.0',
  transactionVersion: 2,
};

const sampleBlock: ChainBlockDto = {
  hash: 'block-hash-42',
  height: 42,
  previousHash: 'prev-hash',
  merkleRoot: 'merkle-root',
  timestamp: '2024-01-01T00:00:00.000Z',
  proposerId: 'val-01',
  version: 2,
  transactionCount: 1,
  transactions: [sampleTransaction],
};

function blockPage(blocks: ChainBlockDto[], offset = 0, limit = 10): ChainBlockPageDto {
  return { blocks, offset, limit };
}

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

  it('only ever addresses the Platform API blockchain proxy', async () => {
    const service = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi(blockPage([sampleBlock])));

    await service.getExplorerBlocks(1, 10);

    const url = callUrl(0);
    expect(url.startsWith(`${API_BASE_URL}/blockchain/`)).toBe(true);
    // No browser-side blockchain service host is ever contacted.
    expect(url).not.toContain(':3001');
  });

  it('maps a real block page into explorer views with pagination metadata', async () => {
    const service = await loadRealService();
    const block41: ChainBlockDto = {
      ...sampleBlock,
      height: 41,
      previousHash: 'prev-2',
      hash: 'block-hash-41',
    };
    fetchMock.mockResolvedValueOnce(fakeApi(blockPage([sampleBlock, block41], 0, 10)));

    const page = await service.getExplorerBlocks(1, 10);

    expect(callUrl(0)).toContain('/blockchain/blocks?offset=0&limit=10');
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(10);
    // total is the number of blocks reached so far (the proxy is offset/limit based)
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
      height: 42 - i,
    }));
    fetchMock.mockResolvedValueOnce(fakeApi(blockPage(blocks, 0, 10)));

    const page = await service.getExplorerBlocks(1, 10);
    expect(page.blocks).toHaveLength(10);
    expect(page.hasMore).toBe(true);
  });

  it('maps a single block by height', async () => {
    const service = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi(sampleBlock));

    const block = await service.getExplorerBlockByHeight(42);
    expect(callUrl(0)).toContain('/blockchain/blocks/42');
    expect(block.height).toBe(42);
    expect(block.transactions).toHaveLength(1);
    expect(block.transactions[0]!.blockHeight).toBe(42);
    expect(block.transactions[0]!.protocolVersion).toBe('1.0 / v2');
  });

  it('maps a transaction record detail response', async () => {
    const service = await loadRealService();
    const record: ChainTransactionRecordDto = {
      ...sampleTransaction,
      blockHeight: 42,
    };
    fetchMock.mockResolvedValueOnce(fakeApi(record));

    const tx = await service.getExplorerTransactionById('tx-1');
    expect(callUrl(0)).toContain('/blockchain/transactions/tx-1');
    expect(tx.id).toBe('tx-1');
    expect(tx.sender).toBe('issuer-1');
    expect(tx.nonce).toBe(7);
    expect(tx.blockHeight).toBe(42);
    expect(tx.type).toBe('CREDENTIAL_ISSUE');
  });

  it('aggregates the recent-transactions list from real blocks (no list endpoint exists)', async () => {
    const service = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi(blockPage([sampleBlock], 0, 25)));

    const res = await service.getRecentTransactions(1, 12);
    // Aggregated from the real block payload — NOT an invented list endpoint.
    expect(callUrl(0)).toContain('/blockchain/blocks?offset=0');
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0]!.id).toBe('tx-1');
    expect(res.transactions[0]!.blockHeight).toBe(42);
  });

  it('maps real validator records to the limited honest view', async () => {
    const service = await loadRealService();
    const validators: ChainValidatorDto[] = [
      { id: 'val-01', publicKey: 'pk-1', status: 'ACTIVE', active: true, addedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'val-02', publicKey: 'pk-2', status: 'INACTIVE', active: false, addedAt: '2024-01-02T00:00:00.000Z' },
    ];
    fetchMock.mockResolvedValueOnce(fakeApi(validators));

    const list = await service.getExplorerValidators();
    expect(callUrl(0)).toContain('/blockchain/validators');
    expect(list).toEqual([
      { id: 'val-01', publicKey: 'pk-1', active: true, addedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'val-02', publicKey: 'pk-2', active: false, addedAt: '2024-01-02T00:00:00.000Z' },
    ]);
  });

  it('maps network status and falls back when metrics are unavailable', async () => {
    const service = await loadRealService();
    const network: ChainNetworkDto = {
      height: 100,
      peerCount: 3,
      validatorCount: 5,
      currentProposer: 'val-01',
      pendingTransactions: 2,
      nodeId: 'node-1',
      status: 'RUNNING',
      connectedPeers: ['node-2'],
      knownPeers: [],
    };
    fetchMock
      .mockResolvedValueOnce(fakeApi(network))
      .mockRejectedValue(new ApiError('metrics down', 0));

    const net = await service.getExplorerNetworkStatus();
    expect(callUrl(0)).toContain('/blockchain/network');
    expect(net.height).toBe(100);
    expect(net.peerCount).toBe(3);
    expect(net.validatorCount).toBe(5);
    // metrics unavailable -> fall back to the network read, and report the
    // versions as unknown rather than inventing them.
    expect(net.activeValidatorCount).toBe(5);
    expect(net.currentProposer).toBe('val-01');
    expect(net.protocolVersion).toBe('unknown');
    expect(net.nodeVersion).toBe('unknown');
    expect(net.nodeId).toBe('node-1');
    expect(net.status).toBe('RUNNING');
  });

  it('uses the metrics read for versions when it is available', async () => {
    const service = await loadRealService();
    const network: ChainNetworkDto = {
      height: 100,
      peerCount: 3,
      validatorCount: 5,
      currentProposer: null,
      pendingTransactions: 0,
      nodeId: 'node-1',
      status: 'RUNNING',
      connectedPeers: [],
      knownPeers: [],
    };
    const metrics: ChainMetricsDto = {
      height: 100,
      blockCount: 100,
      transactionCount: 420,
      validatorCount: 5,
      activeValidatorCount: 4,
      consensusStatus: 'RUNNING',
      currentProposer: 'val-02',
      nodeVersion: 'v3.1.0',
      protocolVersion: '3.1',
      uptimeSeconds: 900,
    };
    fetchMock.mockResolvedValueOnce(fakeApi(network)).mockResolvedValueOnce(fakeApi(metrics));

    const net = await service.getExplorerNetworkStatus();
    expect(net.activeValidatorCount).toBe(4);
    expect(net.currentProposer).toBe('val-02');
    expect(net.protocolVersion).toBe('3.1');
    expect(net.nodeVersion).toBe('v3.1.0');
  });

  it('maps real peers from the single network read', async () => {
    const service = await loadRealService();
    const network: ChainNetworkDto = {
      height: 100,
      peerCount: 1,
      validatorCount: 5,
      currentProposer: null,
      pendingTransactions: 0,
      nodeId: 'node-1',
      status: 'RUNNING',
      connectedPeers: ['node-2'],
      knownPeers: [
        { nodeId: 'node-2', address: 'ws://node2:9000', lastSeen: '2024-01-01', isValidator: true },
      ],
    };
    fetchMock.mockResolvedValue(fakeApi(network));

    const result = await service.getExplorerPeers();
    expect(callUrl(0)).toContain('/blockchain/network');
    expect(result.connected).toEqual(['node-2']);
    expect(result.known).toHaveLength(1);
    expect(result.peerCount).toBe(1);
  });

  it('maps real health response', async () => {
    const service = await loadRealService();
    const health: ChainHealthDto = {
      status: 'UP',
      height: 100,
      peerCount: 3,
      nodeVersion: 'v3.1.0',
      protocolVersion: '3.1',
      checkedAt: '2024-01-01T00:00:00.000Z',
    };
    fetchMock.mockResolvedValueOnce(fakeApi(health));

    const result = await service.getExplorerHealth();
    expect(callUrl(0)).toContain('/blockchain/health');
    expect(result.status).toBe('UP');
    expect(result.height).toBe(100);
    expect(result.protocolVersion).toBe('3.1');
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

  it('retries transient failures then reports the final result', async () => {
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

function validatorsFixture(): ChainValidatorDto[] {
  return [
    {
      id: 'val-01',
      publicKey: 'pk-1',
      status: 'ACTIVE',
      active: true,
      addedAt: '2024-01-01T00:00:00.000Z',
    },
  ];
}
