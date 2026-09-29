// ---------------------------------------------------------------------------
// SECUREX BLOCKCHAIN EXPLORER — READ-ONLY CHAIN DATA ACCESS
//
// This is the ONLY data source for the public Explorer, and it is REAL-only by
// construction:
//
//   * Every call goes to the Platform API's PUBLIC, unauthenticated blockchain
//     read endpoints (`/api/blockchain/*`). The Explorer has no session, no
//     login, and no credential of any kind.
//   * There is no demo/mock branch anywhere in this module, and it imports no
//     fixture, no mock service and no `IS_MOCK` code path. A mock value cannot
//     reach this screen even by accident.
//   * `assertRealMode()` fails the whole app closed if the bundle was somehow
//     built in DEMO mode, so a misconfigured deploy surfaces a loud error
//     instead of quietly rendering demo data on a public site.
//
// DATA SOURCE OF TRUTH: the live SecureX chain, reached through the Platform
// API. The view models and DTO -> view mappers are reused from
// `explorerViewModels` so the Explorer and the application share one canonical
// blockchain data model.
//
// DELIBERATELY NOT USED:
//   * `GET /api/blocks`, `GET /api/transactions`, `GET /api/network/stats` —
//     these read the platform's PostgreSQL `blocks`/`transactions` tables, which
//     hold synthetic SEED rows (22 blocks / 38 transactions) that were written
//     once by `server/db/seed.ts` and are never updated by the node. Rendering
//     them next to live chain state would present demo data as network
//     activity. `/api/network/stats` additionally returns hardcoded telemetry
//     (`nodesOnline: 42`, `tps: 128`, `avgBlockTime: 4.2`).
//   * Any write, admin, issuer, credential or QR endpoint. The Explorer is
//     read-only by design and never calls them.
//
// SEARCH CAPABILITY is limited to what the API actually supports: block height
// and transaction id. There is no block-hash lookup endpoint, so the Explorer
// does not offer one.
// ---------------------------------------------------------------------------

import { config } from '@/config';
import { ApiError, fetchPlatformAPI } from '@/services/api/client';
import {
  CHAIN_API_PREFIX,
  type ChainBlockDto,
  type ChainBlockPageDto,
  type ChainHealthDto,
  type ChainMetricsDto,
  type ChainNetworkDto,
  type ChainStateDto,
  type ChainTransactionDto,
  type ChainTransactionRecordDto,
  type ChainValidatorDto,
} from '@/services/api/blockchainProxy';
import {
  mapBlock,
  toTransactionView,
  type ExplorerBlockPage,
  type ExplorerBlockView,
  type ExplorerNetworkStatus,
  type ExplorerPeers,
  type ExplorerTransactionView,
  type ExplorerValidatorView,
} from '@/features/explorer-simulation/services/explorerViewModels';

export type {
  ExplorerBlockPage,
  ExplorerBlockView,
  ExplorerNetworkStatus,
  ExplorerPeers,
  ExplorerTransactionView,
  ExplorerValidatorView,
};
export type { ChainMetricsDto, ChainStateDto };

/**
 * A generous request budget. The Platform API and the blockchain node both run
 * on Render's free plan and suspend when idle; a cold start was measured at
 * ~23s. The default 15s client timeout would turn a healthy, merely-asleep node
 * into a false "unavailable" error, so the Explorer waits longer and leans on
 * the retry below.
 */
const REQUEST_TIMEOUT_MS = 45_000;
const REQUEST_RETRIES = 2;
const RETRY_DELAY_MS = 900;

/** The chain is empty: a real, correctly-reported state — never an error. */
export class ChainUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainUnavailableError';
  }
}

/** The requested height / transaction id genuinely does not exist on chain. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Fail closed if this bundle was ever built in DEMO mode.
 *
 * `src/config/index.ts` already fails closed to REAL unless VITE_USE_MOCK is the
 * exact string 'true'. This is the second lock on the same door, specific to
 * the public Explorer: a demo build must fail visibly rather than publish demo
 * data at a public URL.
 */
export function assertRealMode(): void {
  if (config.IS_MOCK) {
    throw new ChainUnavailableError(
      'This Explorer build is configured for demo data. It must be rebuilt with VITE_USE_MOCK unset so it reads live chain data only.',
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function chainRequest<T>(url: string, attempt = 0): Promise<T> {
  assertRealMode();
  try {
    return await fetchPlatformAPI<T>(url, {}, REQUEST_TIMEOUT_MS);
  } catch (error) {
    // Retry transient transport failures. A 404 is a real answer ("this block
    // does not exist"), so it is converted and never retried.
    if (error instanceof ApiError && error.status === 404) {
      throw new NotFoundError(error.message);
    }
    if (attempt < REQUEST_RETRIES) {
      await delay(RETRY_DELAY_MS * (attempt + 1));
      return chainRequest<T>(url, attempt + 1);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Network / health / state / metrics
// ---------------------------------------------------------------------------

export function getChainHealth(): Promise<ChainHealthDto> {
  return chainRequest<ChainHealthDto>(`${CHAIN_API_PREFIX}/health`);
}

export function getChainState(): Promise<ChainStateDto> {
  return chainRequest<ChainStateDto>(`${CHAIN_API_PREFIX}/state`);
}

export function getChainNetwork(): Promise<ChainNetworkDto> {
  return chainRequest<ChainNetworkDto>(`${CHAIN_API_PREFIX}/network`);
}

export function getChainMetrics(): Promise<ChainMetricsDto> {
  return chainRequest<ChainMetricsDto>(`${CHAIN_API_PREFIX}/metrics`);
}

/**
 * Everything the Explorer header and Network page need, fetched once.
 *
 * `metrics` is best-effort: it carries the protocol/node versions and the
 * active-validator split, but a metrics hiccup must not blank out the whole
 * page when health and network status are both readable.
 */
export interface ChainSummary {
  health: ChainHealthDto | null;
  network: ChainNetworkDto | null;
  metrics: ChainMetricsDto | null;
  state: ChainStateDto | null;
}

export async function getChainSummary(): Promise<ChainSummary> {
  // Health, network and state are the required reads: a failure in any of them
  // is the "blockchain service unavailable" case the UI must surface.
  const [health, network, state] = await Promise.all([
    getChainHealth(),
    getChainNetwork(),
    getChainState(),
  ]);
  // Metrics and a validator count are enrichments.
  const metrics = await getChainMetrics().catch(() => null);
  return { health, network, state, metrics };
}

export function toNetworkStatus(
  network: ChainNetworkDto,
  metrics: ChainMetricsDto | null,
): ExplorerNetworkStatus {
  return {
    height: network.height,
    peerCount: network.peerCount,
    validatorCount: network.validatorCount,
    activeValidatorCount: metrics?.activeValidatorCount ?? network.validatorCount,
    currentProposer: network.currentProposer ?? metrics?.currentProposer ?? null,
    pendingTransactions: network.pendingTransactions,
    protocolVersion: metrics?.protocolVersion ?? '—',
    nodeVersion: metrics?.nodeVersion ?? '—',
    nodeId: network.nodeId,
    status: network.status,
  };
}

export async function getNetworkStatus(): Promise<ExplorerNetworkStatus> {
  const [network, metrics] = await Promise.all([
    getChainNetwork(),
    getChainMetrics().catch(() => null),
  ]);
  return toNetworkStatus(network, metrics);
}

export async function getPeers(): Promise<ExplorerPeers> {
  const network = await getChainNetwork();
  return {
    connected: network.connectedPeers,
    known: network.knownPeers,
    peerCount: network.peerCount,
  };
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * The chain returns a bare page of blocks with no `total`, so the page reports
 * how many rows it actually received and derives "is there more" from a full
 * page. `total` therefore means "reached so far", never an invented count.
 */
export async function getBlocks(page = 1, pageSize = 10): Promise<ExplorerBlockPage> {
  const offset = (page - 1) * pageSize;
  const result = await chainRequest<ChainBlockPageDto>(
    `${CHAIN_API_PREFIX}/blocks?offset=${offset}&limit=${pageSize}`,
  );
  const blocks = result.blocks ?? [];
  return {
    blocks: blocks.map(mapBlock),
    total: offset + blocks.length,
    offset,
    limit: pageSize,
    hasMore: blocks.length === pageSize,
  };
}

export function getBlockByHeight(height: number): Promise<ExplorerBlockView> {
  return chainRequest<ChainBlockDto>(
    `${CHAIN_API_PREFIX}/blocks/${height}`,
  ).then(mapBlock);
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * The chain exposes no transaction-LIST endpoint (only `GET /transactions/:id`
 * and an authenticated `POST`). The list is therefore compiled from the
 * transactions inside real blocks, newest block first. This is honest: every row
 * genuinely came out of a committed block, and a chain with no transactions
 * yields an empty list rather than invented activity.
 */
export async function getRecentTransactions(
  page = 1,
  pageSize = 12,
): Promise<{ transactions: ExplorerTransactionView[]; total: number; hasMore: boolean }> {
  const collected: ExplorerTransactionView[] = [];
  const blockBatch = 25;
  let blockOffset = 0;
  let scannedBlocks = 0;

  while (collected.length < pageSize && scannedBlocks < 250) {
    const result = await chainRequest<ChainBlockPageDto>(
      `${CHAIN_API_PREFIX}/blocks?offset=${blockOffset}&limit=${blockBatch}`,
    );
    const blocks = result.blocks ?? [];
    if (blocks.length === 0) break;

    for (const block of blocks) {
      scannedBlocks += 1;
      for (const tx of block.transactions) {
        collected.push(toTransactionView(tx as ChainTransactionDto, block.height));
      }
    }
    if (blocks.length < blockBatch) break;
    blockOffset += blockBatch;
  }

  const start = (page - 1) * pageSize;
  return {
    transactions: collected.slice(start, start + pageSize),
    total: collected.length,
    hasMore: start + pageSize < collected.length,
  };
}

export function getTransactionById(
  id: string,
): Promise<ExplorerTransactionView> {
  return chainRequest<ChainTransactionRecordDto>(
    `${CHAIN_API_PREFIX}/transactions/${encodeURIComponent(id)}`,
  ).then((record) => toTransactionView(record, record.blockHeight));
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Public validator identities only: id, Ed25519 PUBLIC key, status and join
 * time. The chain never exposes private signing material over this endpoint and
 * the Explorer does not attempt to reach any endpoint that might.
 */
export async function getValidators(): Promise<ExplorerValidatorView[]> {
  const validators = await chainRequest<ChainValidatorDto[]>(
    `${CHAIN_API_PREFIX}/validators`,
  );
  return validators.map((v) => ({
    id: v.id,
    publicKey: v.publicKey,
    active: v.active,
    addedAt: v.addedAt,
  }));
}

export async function getValidatorById(
  id: string,
): Promise<ExplorerValidatorView | null> {
  const validators = await getValidators();
  return validators.find((v) => v.id.toLowerCase() === id.toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchResult =
  | { kind: 'block'; height: number }
  | { kind: 'transaction'; id: string };

/**
 * Classify a search query using ONLY the lookups the API actually provides.
 *
 *   integer            -> block by height  (GET /blockchain/blocks/:height)
 *   anything else      -> transaction by id (GET /blockchain/transactions/:id)
 *
 * There is no block-hash lookup endpoint, so a 64-char hash is NOT treated as a
 * block search: it is passed to the transaction lookup, which will answer
 * honestly with "not found" instead of appearing to work.
 */
export function classifySearchQuery(raw: string): SearchResult {
  const query = raw.trim();
  if (/^\d+$/.test(query)) {
    return { kind: 'block', height: Number(query) };
  }
  return { kind: 'transaction', id: query };
}
