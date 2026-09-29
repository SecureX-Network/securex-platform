// ---------------------------------------------------------------------------
// SECUREX EXPLORER — VIEW MODELS (pure; no data sources, no mock imports)
//
// These are the explorer's presentation types and the mappers that project the
// Platform API's blockchain DTOs onto them. They are deliberately free of ANY
// import that could reach mock/demo data or a fetch: only `blockchainProxy`'s
// DTO types, which are `import type` (erased at build time) and describe the
// REAL chain contract.
//
// Keeping them in their own module means two very different consumers can share
// exactly one definition of the blockchain data model:
//
//   * `services/explorerService.ts` — the SecureX application's explorer, which
//     supports a DEMO mode and therefore imports mock fixtures.
//   * `src/explorer/services/chainApi.ts` — the dedicated PUBLIC Explorer,
//     which is read-only and REAL-only. Importing from here guarantees the
//     public bundle contains no demo fixtures and no demo code path at all,
//     while still reusing one canonical blockchain data model.
//
// The contract these types describe is real, not invented. The chain is a
// permissioned Proof-of-Authority ledger: there is no gas, no mining, no
// confirmations and no currency, so none of those concepts appear anywhere in
// these shapes. Fields the API does not provide are absent, not faked.
// ---------------------------------------------------------------------------

import type { ChainBlockDto, ChainTransactionDto } from '@/services/api/blockchainProxy';

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

export interface ExplorerValidatorView {
  id: string;
  publicKey: string;
  active: boolean;
  addedAt: string;
}

export interface ExplorerHealthView {
  status: string;
  height: number;
  peerCount: number;
  nodeVersion: string;
  protocolVersion: string;
  checkedAt: string;
}

export interface ExplorerBlockPage {
  blocks: ExplorerBlockView[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function mapBlock(block: ChainBlockDto): ExplorerBlockView {
  return {
    height: block.height,
    hash: block.hash,
    previousHash: block.previousHash,
    merkleRoot: block.merkleRoot,
    timestamp: block.timestamp,
    proposerId: block.proposerId,
    transactionCount: block.transactionCount,
    version: block.version,
    transactions: block.transactions.map((tx) => toTransactionView(tx, block.height)),
  };
}

export function toTransactionView(
  tx: ChainTransactionDto,
  blockHeight?: number,
): ExplorerTransactionView {
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
