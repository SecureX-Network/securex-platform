// Types describing the ACTUAL securex-blockchain V3.1 REST API response shapes.
// These mirror the backend contract in SecureX-Network/securex-blockchain
// (src/api/server.ts, src/core/state/state.ts, src/services/verification.ts)
// and are intentionally separate from the shared `@/types` demo shapes so that
// holder-admin renders real backend data without inventing fields.

export type ApiIssuerStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface ApiIssuer {
  issuerId: string;
  name: string;
  publicKey: string;
  status: ApiIssuerStatus;
  registeredAt: string;
  updatedAt?: string;
  metadata: Record<string, unknown>;
}

export type ApiCredentialStatus =
  | 'CREATED'
  | 'ISSUED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'REISSUED';

export interface ApiLifecycleEvent {
  type: string;
  timestamp: string;
  txId?: string;
  blockHeight?: number;
  data?: Record<string, unknown>;
}

export interface ApiCredential {
  credentialId: string;
  issuerId: string;
  credentialHash: string;
  status: ApiCredentialStatus;
  schemaVersion: string;
  issuedAt: string;
  lastUpdated: string;
  revokedAt?: string;
  suspendedAt?: string;
  reissuedFrom?: string;
  reissuedTo?: string;
  currentReissue?: string;
  metadata: Record<string, unknown>;
  lifecycle: ApiLifecycleEvent[];
}

export interface ApiCredentialHistoryEntry {
  type: string;
  timestamp: string;
  txId?: string;
  blockHeight?: number;
}

export interface ApiCredentialSummary {
  currentStatus: string;
  lastEvent: { type: string; timestamp: string; txId?: string; blockHeight?: number; blockHash?: string; reason?: string } | null;
  eventCount: number;
}

export interface ApiIssuerHistory {
  issuerHistory: ApiLifecycleEvent[];
  credentials: ApiCredentialSummary[];
}

export type ApiVerificationStatus =
  | 'VALID'
  | 'REVOKED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'INVALID'
  | 'NOT_FOUND'
  | 'UNVERIFIABLE';

export interface ApiVerifyResult {
  status: ApiVerificationStatus;
  credentialId: string;
  credentialHash: string;
  issuer?: {
    issuerId: string;
    name: string;
    publicKey: string;
    status: string;
  };
  lifecycle?: {
    issuedAt: string;
    lastUpdated: string;
    version: string;
  };
  transaction?: {
    id: string;
    type: string;
    sender: string;
    nonce: number;
    blockHeight: number;
    blockHash: string;
  };
  block?: {
    height: number;
    hash: string;
    timestamp: string;
    previousHash: string;
    proposer: string;
    version: number;
  };
  issuerSignatureValid?: boolean;
  keyStatus?: string;
  protocolCompatible?: boolean;
  verifiedAt?: string;
  securityChecks?: Record<string, boolean>;
  documentHashCheck?: {
    credentialId: string;
    suppliedHash: string;
    anchoredHash: string | null;
    hashMatch: boolean;
    status: 'EXACT' | 'TAMPERED' | 'UNVERIFIABLE';
    verifiedAt: string;
  };
  credential?: {
    credentialId: string;
    issuerId: string;
    status: string;
    schemaVersion: string;
    issuedAt: string;
    lastUpdated: string;
  };
  error?: string;
  errorMessage?: string;
}

/** Response from POST /contracts/tamper-check and GET /state/credentials/:id/evidence anchor. */
export type TamperCheckStatus = 'EXACT' | 'TAMPERED' | 'UNVERIFIABLE';

export interface ApiTamperCheckResult {
  credentialId: string;
  suppliedHash: string;
  anchoredHash: string | null;
  hashMatch: boolean;
  status: TamperCheckStatus;
  verifiedAt: string;
}

export interface ApiQrReference {
  credentialId: string;
  version: string;
  verificationUrl: string;
  payload: { credentialId: string; version: string; protocol?: string };
  exists: boolean;
  qrContent: string;
}

/** Response envelope from POST /issuers, /credentials, and lifecycle mutations. */
export interface ApiMutationReceipt {
  submitted: boolean;
  id: string;
  type: string;
  sender: string;
  nonce: number;
  status: 'PENDING';
}

export interface ApiAuditEvent {
  id: string;
  type: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  referenceType?: string;
  referenceId?: string;
  txId?: string;
  credentialId?: string;
  issuerId?: string;
  blockHeight?: number;
  actor?: string;
}

export interface ApiAuditSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<'info' | 'warning' | 'critical', number>;
}

export interface ApiStateSummary {
  height: number;
  issuers: number;
  credentials: number;
  validators: number;
  keys: number;
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
