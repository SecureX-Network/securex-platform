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
 * A request budget deliberately matched to the Platform API's own retry budget.
 *
 * `server/services/blockchain.ts` already retries a sleeping node eight times
 * over roughly 40s before giving up and returning a definitive
 * `502 BLOCKCHAIN_UNREACHABLE`. That budget is the thing this timeout has to
 * outlast: a client timeout *shorter* than it would throw away a request the
 * API was about to answer successfully, turning a healthy, merely-asleep node
 * into a false failure. 45s sits just above the measured ~40s.
 *
 * (The code default for `BLOCKCHAIN_TIMEOUT_MS` is 10s; production sets 60s.)
 */
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * NO second retry layer here.
 *
 * There used to be two retries, and the arithmetic is the whole story: a
 * request that could take 45s, retried twice more, is a single cycle that can
 * block for up to 149s. Measured against a sleeping production node, that is
 * exactly how long the header sat on "Connecting" before it learned anything —
 * the node had woken after ~22s, but the Explorer was still inside its own
 * redundant retry fan-out and had no failure to report yet.
 *
 * Worse, each of those three attempts is a fresh upstream request to a
 * free-tier instance that is already struggling to boot.
 *
 * Retrying here was always redundant: the API does the retrying, and once its
 * budget is spent it returns a definitive 502 that `isTransientChainError`
 * recognises. Retrying again is the bounded recovery ladder's job, and that
 * ladder (`useChainResource`) has properties a blind in-request retry does not:
 * it backs off, it is capped, it pauses on a hidden tab, and it stops.
 */
const REQUEST_RETRIES = 0;
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
 * Is this failure the node being *asleep*, rather than something being wrong?
 *
 * Both the Platform API and the blockchain node run on Render's free plan, so
 * the single most common failure is infrastructural rather than a fault: a
 * suspended instance answers 429/502/503/504 while it cold-starts (~22s
 * measured), and the Platform API — which retries upstream for up to
 * `BLOCKCHAIN_TIMEOUT_MS` — eventually surfaces that to us as a 502.
 *
 * Those deserve a very different response from a real fault:
 *
 *   transient  -> the node is waking; retry patiently and say so honestly
 *   genuine    -> retrying is pointless and only adds load; say it failed
 *
 * The distinction is what stops the Explorer from hammering a node that is
 * already struggling, and from telling a visitor the network is broken when it
 * is merely asleep.
 *
 * `ApiError.status === 0` is this client's own timeout or a transport failure
 * (see `requestJson`), so the request's fate is genuinely unknown — treated as
 * transient for the same reason.
 */
export function isTransientChainError(error: unknown): boolean {
  if (error instanceof NotFoundError) return false;
  if (error instanceof ApiError) {
    return error.status === 0 || error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504;
  }
  // A raw transport error that never became an ApiError is, by definition, not
  // an answer from the service.
  return error instanceof TypeError || error instanceof Error;
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
 *
 * HEALTH IS FETCHED FIRST, ALONE, ON PURPOSE.
 *
 * A page load used to fan out to health + network + state together, so every
 * attempt while the node was asleep cost four requests, each of which the
 * Platform API then retried upstream up to eight times. During a cold start
 * that is ~32 upstream requests per load, from every open tab — enough to keep
 * a struggling free instance struggling.
 *
 * Probing health first means a failing cycle costs ONE request, and the node is
 * only asked for the rest of the summary once it has actually answered. When
 * the node is healthy the extra round trip is a few tens of milliseconds.
 */
export interface ChainSummary {
  health: ChainHealthDto | null;
  network: ChainNetworkDto | null;
  metrics: ChainMetricsDto | null;
  state: ChainStateDto | null;
}

export async function getChainSummary(): Promise<ChainSummary> {
  // The single gate: if the node cannot answer a health probe it is asleep, and
  // nothing else is worth asking for.
  const health = await getChainHealth();

  const [network, state] = await Promise.all([getChainNetwork(), getChainState()]);
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
