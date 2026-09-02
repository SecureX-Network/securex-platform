// Core credential types
export type CredentialStatus =
  | 'VALID'
  | 'INVALID'
  | 'REVOKED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TAMPERED'
  | 'SUSPICIOUS'
  | 'NOT_FOUND';

export type UserRole =
  | 'PUBLIC'
  | 'HOLDER'
  | 'INSTITUTION'
  | 'ISSUER'
  | 'EMPLOYER'
  | 'ADMIN'
  | 'SECURITY_ADMIN'
  | 'NETWORK_ADMIN'
  | 'AUDITOR';

export type TransactionType =
  | 'CREDENTIAL_ISSUED'
  | 'CREDENTIAL_VERIFIED'
  | 'CREDENTIAL_REVOKED'
  | 'CREDENTIAL_SUSPENDED'
  | 'INSTITUTION_REGISTERED'
  | 'ISSUER_ADDED'
  | 'BLOCK_CREATED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  institutionId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Institution {
  id: string;
  name: string;
  type: string;
  logo?: string;
  website: string;
  verified: boolean;
  credentialCount: number;
  issuerCount: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
}

export interface Issuer {
  id: string;
  name: string;
  institutionId: string;
  institutionName: string;
  email: string;
  publicKey: string;
  status: 'ACTIVE' | 'REVOKED' | 'SUSPENDED';
  credentialsIssued: number;
  createdAt: string;
}

export interface Credential {
  id: string;
  credentialId: string;
  type: string;
  title: string;
  description: string;
  holderName: string;
  holderId: string;
  issuerId: string;
  issuerName: string;
  institutionId: string;
  institutionName: string;
  status: CredentialStatus;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  blockchainTxHash?: string;
  merkleRoot?: string;
  digitalSignature?: string;
  templateId?: string;
  metadata?: Record<string, string>;
}

export interface VerificationResult {
  credentialId: string;
  status: CredentialStatus;
  credential?: Credential;
  issuer: {
    name: string;
    verified: boolean;
    publicKey?: string;
  };
  blockchainProof: {
    verified: boolean;
    txHash?: string;
    blockHeight?: number;
    confirmations?: number;
    timestamp?: string;
  };
  signatureVerification: {
    valid: boolean;
    algorithm?: string;
    verifiedAt?: string;
  };
  fraudCheck: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    flags: string[];
    score: number;
  };
  verifiedAt: string;
  verifiedBy?: string;
}

export interface VerificationHistory {
  id: string;
  credentialId: string;
  credentialTitle: string;
  verifiedAt: string;
  verifiedBy: string;
  result: CredentialStatus;
  method: 'QR_CODE' | 'MANUAL' | 'API' | 'LINK';
  ipAddress?: string;
}

export interface BlockchainBlock {
  height: number;
  hash: string;
  previousHash: string;
  merkleRoot: string;
  timestamp: string;
  validator: string;
  transactionCount: number;
  size: number;
}

export interface BlockchainTransaction {
  id: string;
  blockHeight: number;
  type: TransactionType;
  timestamp: string;
  from: string;
  to: string;
  credentialId?: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  gasUsed?: number;
  confirmations: number;
}

export interface RiskAssessment {
  id: string;
  credentialId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  flags: string[];
  assessedAt: string;
  method: string;
}

export interface SecurityAlert {
  id: string;
  type:
    | 'FRAUD_ATTEMPT'
    | 'SUSPICIOUS_VERIFICATION'
    | 'UNAUTHORIZED_ACCESS'
    | 'SYSTEM_ANOMALY'
    | 'BRUTE_FORCE'
    | 'CREDENTIAL_TAMPERING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  source: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  actorRole: UserRole;
  target: string;
  targetType: string;
  details?: string;
  ipAddress: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  createdAt: string;
  usageCount: number;
}

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
