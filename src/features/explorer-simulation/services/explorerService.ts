import { IS_MOCK } from '@/constants';
import { ApiError, fetchBlockchainAPI } from '@/services/api/client';
import { mockDelay } from '@/services/mock';
import type {
  ApiBlock,
  ApiHealth,
  ApiMetrics,
  ApiNetworkStatus,
  ApiPeers,
  ApiTransaction,
  ApiTransactionRecord,
  ApiValidator,
} from '../types/backend';
import { MOCK_PEERS } from '../data/network';
import { MOCK_VALIDATORS } from '../data/validators';
import type { NetworkOverview, Peer, Validator } from '../types';

export type DataSourceMode = 'REAL' | 'DEMO';

export function getDataSourceMode(): DataSourceMode {
  return IS_MOCK ? 'DEMO' : 'REAL';
}

// ---------------------------------------------------------------------------
// View models for the explorer UI. These represent real backend data in a
// shape the UI can render without the invented/demo-only fields (gas, from/to,
// confirmations, currency concepts) that the old shared mock types carried.
// ---------------------------------------------------------------------------

export interface ExplorerBlockView {
  height: number;
  hash: string;
  previousHash: string;
  merkleRoot: string;
  timestamp: string;
  proposerId: string;
  transactionCount: number;
  version: number;
  transactions: ExplorerTransactionView[];
}

export interface ExplorerTransactionView {
  id: string;
  type: string;
  timestamp: string;
  sender: string;
  nonce: number;
  blockHeight: number;
  protocolVersion: string;
}

export interface ExplorerNetworkStatus {
  height: number;
  peerCount: number;
  validatorCount: number;
  activeValidatorCount: number;
  currentProposer: string | null;
  pendingTransactions: number;
  protocolVersion: string;
  nodeVersion: string;
  nodeId: string;
  status: string;
}

export interface ExplorerPeers {
  connected: string[];
  known: Array<{ nodeId: string; address: string; lastSeen: string; isValidator: boolean }>;
  peerCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(new ApiError('The request timed out. Please try again.', 0)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

async function runWithRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 600): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < retries) await mockDelay(delayMs);
    }
  }
  throw lastError;
}

function mapBlock(block: ApiBlock): ExplorerBlockView {
  return {
    height: block.header.height,
    hash: block.hash,
    previousHash: block.header.previousHash,
    merkleRoot: block.header.merkleRoot,
    timestamp: block.header.timestamp,
    proposerId: block.header.proposerId,
    transactionCount: block.transactions.length,
    version: block.header.version,
    transactions: block.transactions.map((tx) =>
      toTransactionView(tx, block.header.height),
    ),
  };
}

export function toTransactionView(tx: ApiTransaction, blockHeight?: number): ExplorerTransactionView {
  return {
    id: tx.id,
    type: tx.type,
    timestamp: tx.timestamp,
    sender: tx.sender,
    nonce: tx.nonce,
    blockHeight: blockHeight ?? 0,
    protocolVersion: `${tx.protocolVersion} / v${tx.transactionVersion}`,
  };
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export interface ExplorerBlockPage {
  blocks: ExplorerBlockView[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export async function getExplorerBlocks(
  page: number,
  pageSize = 10,
): Promise<ExplorerBlockPage> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    // Demo fallback derives from the canonical mock service so we don't
    // duplicate blockchain state unnecessarily (Phase 3 retains demo mode).
    const { getBlocks } = await import('@/services/api/blockchainService');
    const res = await getBlocks(page);
    return {
      blocks: res.data.map((b) => ({
        height: b.height,
        hash: b.hash,
        previousHash: b.previousHash,
        merkleRoot: b.merkleRoot,
        timestamp: b.timestamp,
        proposerId: b.validator,
        transactionCount: b.transactionCount,
        version: 2,
        transactions: [],
      })),
      total: res.total,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      hasMore: page * pageSize < res.total,
    };
  }

  const offset = (page - 1) * pageSize;
  const blocks = await runWithRetry(() =>
    withTimeout(fetchBlockchainAPI<ApiBlock[]>(`/blocks?offset=${offset}&limit=${pageSize}`)),
  );
  const reached = offset + blocks.length;
  return {
    blocks: blocks.map(mapBlock),
    total: reached,
    offset,
    limit: pageSize,
    hasMore: blocks.length === pageSize,
  };
}

export async function getExplorerBlockByHeight(height: number): Promise<ExplorerBlockView> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    const { getBlockByHeight } = await import('@/services/api/blockchainService');
    const b = await getBlockByHeight(height);
    const { MOCK_TRANSACTIONS } = await import('@/services/mock');
    const transactions = MOCK_TRANSACTIONS.filter(
      (tx) => tx.blockHeight === height,
    ).map((tx) =>
      toTransactionView(
        {
          protocolVersion: '1.0',
          transactionVersion: 1,
          id: tx.id,
          type: tx.type as ApiTransaction['type'],
          timestamp: tx.timestamp,
          sender: tx.from,
          nonce: 1,
          payload: {},
          signature: '',
        },
        tx.blockHeight,
      ),
    );
    return {
      height: b.height,
      hash: b.hash,
      previousHash: b.previousHash,
      merkleRoot: b.merkleRoot,
      timestamp: b.timestamp,
      proposerId: b.validator,
      transactionCount: transactions.length || b.transactionCount,
      version: 2,
      transactions,
    };
  }
  const block = await runWithRetry(() =>
    withTimeout(fetchBlockchainAPI<ApiBlock>(`/blocks/${height}`)),
  );
  return mapBlock(block);
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function getExplorerTransactionById(
  id: string,
): Promise<ExplorerTransactionView> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    const { getTransactionById } = await import('@/services/api/blockchainService');
    const tx = await getTransactionById(id);
    return toTransactionView(
      {
        protocolVersion: '1.0',
        transactionVersion: 1,
        id: tx.id,
        type: tx.type as ApiTransaction['type'],
        timestamp: tx.timestamp,
        sender: tx.from,
        nonce: 1,
        payload: {},
        signature: '',
      },
      tx.blockHeight,
    );
  }
  const record = await runWithRetry(() =>
    withTimeout(fetchBlockchainAPI<ApiTransactionRecord>(`/transactions/${id}`)),
  );
  return toTransactionView(record.transaction, record.blockHeight);
}

// The SecureX Blockchain V2 API has NO transaction-list endpoint (only
// GET /transactions/:id and POST /transactions). The transactions browse page
// therefore compiles its list from recent REAL block data (small, demo-scale
// chain). This is honest: every transaction genuinely comes from a real block.
export async function getRecentTransactions(
  page = 1,
  pageSize = 12,
): Promise<{ transactions: ExplorerTransactionView[]; total: number; hasMore: boolean }> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    const { getTransactions } = await import('@/services/api/blockchainService');
    const res = await getTransactions(page);
    return {
      transactions: res.data.map((tx) =>
        toTransactionView(
          {
            protocolVersion: '1.0',
            transactionVersion: 1,
            id: tx.id,
            type: tx.type as ApiTransaction['type'],
            timestamp: tx.timestamp,
            sender: tx.from,
            nonce: 1,
            payload: {},
            signature: '',
          },
          tx.blockHeight,
        ),
      ),
      total: res.total,
      hasMore: page * pageSize < res.total,
    };
  }

  // Gather enough recent blocks to cover the requested page. We page backwards
  // from the head of the chain and aggregate the transactions in newest-first
  // order. pageSize here counts transactions, so we may need multiple block
  // pages to fill a transaction page.
  const out: ExplorerTransactionView[] = [];
  let hasMore = false;
  let blockOffset = 0;
  const blockBatch = 25;
  let scannedBlocks = 0;

  while (out.length < pageSize && scannedBlocks < 500) {
    const blocks = await runWithRetry(() =>
      withTimeout(
        fetchBlockchainAPI<ApiBlock[]>(
          `/blocks?offset=${blockOffset}&limit=${blockBatch}`,
        ),
      ),
    );
    if (blocks.length === 0) break;
    for (const block of blocks) {
      scannedBlocks += 1;
      for (const tx of block.transactions) {
        out.push(toTransactionView(tx, block.header.height));
      }
    }
    if (blocks.length < blockBatch) break;
    blockOffset += blockBatch;
  }

  // Apply page slicing over the flattened, newest-first aggregated list.
  const start = (page - 1) * pageSize;
  const pageSlice = out.slice(start, start + pageSize);
  hasMore = start + pageSize < out.length;
  return { transactions: pageSlice, total: out.length, hasMore };
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export interface ExplorerValidatorView {
  id: string;
  publicKey: string;
  active: boolean;
  addedAt: string;
}

export async function getExplorerValidators(): Promise<ExplorerValidatorView[]> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return MOCK_VALIDATORS.map((v: Validator) => ({
      id: v.id,
      publicKey: v.publicKey,
      active: v.status === 'ONLINE' || v.status === 'SYNCING',
      addedAt: v.joinedAt,
    }));
  }
  const validators = await runWithRetry(() =>
    withTimeout(fetchBlockchainAPI<ApiValidator[]>(`/state/validators`)),
  );
  return validators.map((v) => ({
    id: v.validatorId,
    publicKey: v.publicKey,
    active: v.status === 'ACTIVE',
    addedAt: v.addedAt,
  }));
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export async function getExplorerNetworkStatus(): Promise<ExplorerNetworkStatus> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    const network = (await import('../data/network')).MOCK_NETWORK as NetworkOverview;
    return {
      height: network.currentHeight,
      peerCount: network.connectedPeers,
      validatorCount: network.totalValidators,
      activeValidatorCount: network.onlineValidators,
      currentProposer: network.consensus.proposer,
      pendingTransactions: 0,
      protocolVersion: network.protocolVersion,
      nodeVersion: 'v2.1.0',
      nodeId: 'local-demo-node',
      status: 'RUNNING',
    };
  }

  const [status, metrics]: [ApiNetworkStatus, ApiMetrics | null] = await Promise.all([
    runWithRetry(() => withTimeout(fetchBlockchainAPI<ApiNetworkStatus>(`/network/status`))),
    runWithRetry(() =>
      withTimeout(fetchBlockchainAPI<ApiMetrics>(`/metrics`)).catch(() => null),
    ),
  ]);

  return {
    height: status.height,
    peerCount: status.peerCount,
    validatorCount: status.validators,
    activeValidatorCount: metrics?.validators.active ?? status.validators,
    currentProposer: status.currentProposer ?? metrics?.consensus.currentProposer ?? null,
    pendingTransactions: status.pendingTransactions,
    protocolVersion: metrics?.node.protocolVersion ?? '2.0',
    nodeVersion: metrics?.node.version ?? '0.1.0',
    nodeId: status.nodeId,
    status: status.status,
  };
}

export async function getExplorerPeers(): Promise<ExplorerPeers> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    return {
      connected: MOCK_PEERS.filter((p: Peer) => p.status === 'ONLINE').map((p) => p.id),
      known: MOCK_PEERS.map((p: Peer) => ({
        nodeId: p.id,
        address: `ws://${p.name.toLowerCase().replace(/\s+/g, '-')}:9000`,
        lastSeen: p.lastSeen,
        isValidator: true,
      })),
      peerCount: MOCK_PEERS.length,
    };
  }
  const peers = await runWithRetry(() =>
    withTimeout(fetchBlockchainAPI<ApiPeers>(`/network/peers`)),
  );
  return peers;
}

export async function getExplorerHealth(): Promise<ApiHealth> {
  if (getDataSourceMode() === 'DEMO') {
    await mockDelay();
    const network = (await import('../data/network')).MOCK_NETWORK as NetworkOverview;
    return {
      nodeId: 'local-demo-node',
      version: 'v2.1.0',
      protocolVersion: '2.0',
      height: network.currentHeight,
      peerCount: network.connectedPeers,
      uptime: 0,
      status: 'UP',
    };
  }
  return runWithRetry(() => withTimeout(fetchBlockchainAPI<ApiHealth>(`/health`)));
}