// ---------------------------------------------------------------------------
// SECUREX PLATFORM API -> BLOCKCHAIN PROXY CONTRACT (browser side).
//
// The browser NEVER addresses the blockchain service. It calls the Platform API
// at /api/blockchain/*, which authenticates and authorizes the caller, performs
// the upstream call with the server-held service credential, and projects the
// upstream payload into the minimal DTOs declared here.
//
// These types therefore describe the PLATFORM API's responses, not the raw
// chain service's responses. The server owns the upstream shapes
// (server/services/blockchain.ts) and is the single place that has to change if
// the chain contract moves. Field-for-field agreement with the projections in
// server/routes/blockchain.ts is intentional: nothing here is a guess.
// ---------------------------------------------------------------------------

/** GET /api/blockchain/health — public, non-identifying node liveness. */
export interface ChainHealthDto {
  status: string;
  height: number;
  peerCount: number;
  nodeVersion: string;
  protocolVersion: string;
  checkedAt: string;
}

/** GET /api/blockchain/state — public aggregate counters only. */
export interface ChainStateDto {
  height: number;
  issuers: number;
  credentials: number;
  validators: number;
  keys: number;
}

/**
 * A chain transaction as projected for the browser: the contract metadata the
 * explorer displays is kept, the transaction PAYLOAD and SIGNATURE are not.
 */
export interface ChainTransactionDto {
  id: string;
  type: string;
  timestamp: string;
  sender: string;
  nonce: number;
  protocolVersion: string;
  transactionVersion: number;
}

/** A block as projected for the browser — flattened, no validator signatures. */
export interface ChainBlockDto {
  hash: string;
  height: number;
  previousHash: string;
  merkleRoot: string;
  timestamp: string;
  proposerId: string;
  version: number;
  transactionCount: number;
  transactions: ChainTransactionDto[];
}

/** GET /api/blockchain/blocks?offset&limit */
export interface ChainBlockPageDto {
  blocks: ChainBlockDto[];
  offset: number;
  limit: number;
}

/** GET /api/blockchain/transactions/:id */
export interface ChainTransactionRecordDto extends ChainTransactionDto {
  blockHeight: number;
}

/** GET /api/blockchain/validators */
export interface ChainValidatorDto {
  id: string;
  publicKey: string;
  status: string;
  active: boolean;
  addedAt: string;
}

export interface ChainPeerDto {
  nodeId: string;
  address: string;
  lastSeen: string;
  isValidator: boolean;
}

/** GET /api/blockchain/network — status and peer topology in one read. */
export interface ChainNetworkDto {
  height: number;
  peerCount: number;
  validatorCount: number;
  currentProposer: string | null;
  pendingTransactions: number;
  nodeId: string;
  status: string;
  connectedPeers: string[];
  knownPeers: ChainPeerDto[];
}

/** GET /api/blockchain/metrics — public operational counters only. */
export interface ChainMetricsDto {
  height: number;
  blockCount: number;
  transactionCount: number;
  validatorCount: number;
  activeValidatorCount: number;
  consensusStatus: string;
  currentProposer: string | null;
  nodeVersion: string;
  protocolVersion: string;
  uptimeSeconds: number;
}

/** GET /api/blockchain/issuers and /issuers/:id — authenticated, tenant-scoped. */
export interface ChainIssuerDto {
  id: string;
  name: string;
  publicKey: string;
  status: string;
  createdAt: string;
}

/** A lifecycle event. The upstream `txId` is exposed as `transactionId`. */
export interface ChainLifecycleEventDto {
  type: string;
  timestamp: string;
  transactionId: string;
  blockHeight: number;
}

export interface ChainCredentialSummaryDto {
  currentStatus: string;
  eventCount: number;
  lastEvent: ChainLifecycleEventDto | null;
}

/** GET /api/blockchain/issuers/:id/history */
export interface ChainIssuerHistoryDto {
  issuerHistory: ChainLifecycleEventDto[];
  credentials: ChainCredentialSummaryDto[];
}

/**
 * GET /api/blockchain/credentials/:id
 *
 * On-chain identity and lifecycle ONLY. The credential hash and issuer metadata
 * are deliberately not projected: display data for a credential comes from the
 * authenticated Platform record (/api/credentials), not from the chain.
 */
export interface ChainCredentialDto {
  credentialId: string;
  issuerId: string;
  status: string;
  issuedAt: string;
  lastUpdated: string;
  revokedAt: string | null;
  suspendedAt: string | null;
  schemaVersion: string;
  lifecycle: ChainLifecycleEventDto[];
}

/** GET /api/blockchain/credentials/:id/history */
export type ChainCredentialHistoryDto = ChainLifecycleEventDto[];

/** GET /api/blockchain/qr/:credentialId */
export interface ChainQrReferenceDto {
  credentialId: string;
  version: string;
  exists: boolean;
  verificationUrl: string;
  qrContent: string;
}

/**
 * POST /api/blockchain/qr/verify
 *
 * `resolved: false` is a NORMAL answer meaning the chain did not authenticate
 * the payload — not a service error. The chain is the component that checks the
 * signature and lifetime, so nothing here claims SecureX verified it.
 */
export interface ChainQrVerifyDto {
  resolved: boolean;
  reason?: string;
  credentialId?: string;
  status?: string;
  checkedAt?: string;
}

/** GET /api/blockchain/audit/events — platform-admin / auditor only. */
export interface ChainAuditEventDto {
  id: string;
  type: string;
  timestamp: string;
  severity: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  credentialId?: string;
  issuerId?: string;
  transactionId?: string;
  blockHeight?: number;
  actor?: string;
}

/** Receipt for a relayed chain write. `submitted: false` is a rejection. */
export interface ChainMutationReceiptDto {
  submitted: boolean;
  id: string;
  status: string;
}

/** Base path of the Platform API's blockchain proxy. */
export const CHAIN_API_PREFIX = '/blockchain';
