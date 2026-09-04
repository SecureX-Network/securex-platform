// Types describing the ACTUAL securex-blockchain V2 REST API response shapes.
// These mirror the backend contract in SecureX-Network/securex-blockchain
// (src/api/server.ts, src/core/block/block.ts, src/core/transaction/transaction.ts)
// and are intentionally separate from the shared `@/types` demo shapes.

export type ApiTransactionType =
  | 'ISSUER_REGISTER'
  | 'ISSUER_UPDATE'
  | 'CREDENTIAL_ISSUE'
  | 'CREDENTIAL_REVOKE'
  | 'CREDENTIAL_SUSPEND'
  | 'CREDENTIAL_REINSTATE'
  | 'CREDENTIAL_REISSUE'
  | 'KEY_REGISTER'
  | 'KEY_ROTATE'
  | 'BATCH_ANCHOR';

export interface ApiTransaction {
  protocolVersion: string;
  transactionVersion: number;
  id: string;
  type: ApiTransactionType;
  timestamp: string;
  sender: string;
  nonce: number;
  payload: Record<string, unknown>;
  signature: string;
}

export interface ApiBlockHeader {
  version: number;
  height: number;
  timestamp: string;
  previousHash: string;
  merkleRoot: string;
  proposerId: string;
}

export interface ApiBlock {
  header: ApiBlockHeader;
  transactions: ApiTransaction[];
  validatorSignatures: Array<{ validatorId: string; signature: string }>;
  hash: string;
}

export interface ApiValidator {
  validatorId: string;
  publicKey: string;
  status: 'ACTIVE' | 'INACTIVE';
  addedAt: string;
}

export interface ApiHealth {
  nodeId: string;
  version: string;
  protocolVersion: string;
  height: number;
  peerCount: number;
  uptime: number;
  status: 'UP' | 'DEGRADED';
}

export interface ApiNetworkStatus {
  nodeId: string;
  height: number;
  peerCount: number;
  validators: number;
  currentProposer: string | null;
  pendingTransactions: number;
  status: string;
}

export interface ApiPeers {
  connected: string[];
  known: Array<{ nodeId: string; address: string; lastSeen: string; isValidator: boolean }>;
  peerCount: number;
}

export interface ApiTransactionRecord {
  transaction: ApiTransaction;
  blockHeight: number;
}

// Metrics returned by GET /metrics (subset used by the explorer).
export interface ApiMetrics {
  chain: {
    height: number;
    blockCount: number;
    latestBlockHash: string;
    transactionCount: number;
  };
  validators: { count: number; active: number };
  network: { peerCount: number; knownPeers: number };
  consensus: { status: string; currentProposer: string | null; minSignatures: number };
  node: {
    nodeId: string;
    version: string;
    protocolVersion: string;
    uptimeSeconds: number;
  };
}