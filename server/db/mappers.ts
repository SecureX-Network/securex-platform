import {
  parseJson,
} from '../utils/http.js';
import type { AuthUser } from '../middleware/auth.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: AuthUser['role'];
  institution_id: string | null;
  created_at: string;
  last_login_at: string | null;
  password_hash: string;
}

export interface InstitutionRow {
  id: string;
  name: string;
  type: string;
  website: string;
  verified: number;
  status: string;
  created_at: string;
  credential_count?: number;
  issuer_count?: number;
}

export interface IssuerRow {
  id: string;
  name: string;
  institution_id: string;
  institution_name?: string;
  email: string;
  public_key: string;
  status: string;
  credentials_issued: number;
  created_at: string;
}

export interface CredentialRow {
  id: string;
  credential_id: string;
  type: string;
  title: string;
  description: string;
  holder_name: string;
  holder_id: string;
  issuer_id: string;
  issuer_name?: string;
  institution_id: string;
  institution_name?: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  tx_hash: string | null;
  merkle_root: string | null;
  digital_signature: string | null;
  template_id: string | null;
  metadata_json: string | null;
}

export interface BlockRow {
  height: number;
  hash: string;
  previous_hash: string;
  merkle_root: string;
  timestamp: string;
  validator: string;
  transaction_count: number;
  size: number;
}

export interface TransactionRow {
  id: string;
  block_height: number;
  type: string;
  timestamp: string;
  from_address: string;
  to_address: string;
  credential_id: string | null;
  status: string;
  gas_used: number | null;
  confirmations: number;
}

export interface AuditRow {
  id: string;
  action: string;
  actor: string;
  actor_role: string;
  target: string;
  target_type: string;
  details: string | null;
  ip_address: string;
  timestamp: string;
}

export interface SecurityAlertRow {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  source: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface RiskAssessmentRow {
  id: string;
  credential_id: string;
  risk_level: string;
  score: number;
  flags_json: string | null;
  assessed_at: string;
  method: string;
}

export interface VerificationHistoryRow {
  id: string;
  credential_id: string;
  credential_title: string;
  verified_at: string;
  verified_by: string;
  result: string;
  method: string;
  ip_address: string | null;
}

export function mapUserRow(row: UserRow) {
  const { password_hash, institution_id, ...rest } = row;
  void password_hash;
  return {
    ...rest,
    institutionId: institution_id ?? undefined,
  };
}

export function mapInstitutionRow(row: InstitutionRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    website: row.website,
    verified: Boolean(row.verified),
    credentialCount: Number(row.credential_count ?? 0),
    issuerCount: Number(row.issuer_count ?? 0),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapIssuerRow(row: IssuerRow) {
  return {
    id: row.id,
    name: row.name,
    institutionId: row.institution_id,
    institutionName: row.institution_name ?? row.institution_id,
    email: row.email,
    publicKey: row.public_key,
    status: row.status,
    credentialsIssued: Number(row.credentials_issued ?? 0),
    createdAt: row.created_at,
  };
}

export function mapCredentialRow(row: CredentialRow) {
  return {
    id: row.id,
    credentialId: row.credential_id,
    type: row.type,
    title: row.title,
    description: row.description,
    holderName: row.holder_name,
    holderId: row.holder_id,
    issuerId: row.issuer_id,
    issuerName: row.issuer_name ?? row.issuer_id,
    institutionId: row.institution_id,
    institutionName: row.institution_name ?? row.institution_id,
    status: row.status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    revokedReason: row.revoked_reason ?? undefined,
    blockchainTxHash: row.tx_hash ?? undefined,
    merkleRoot: row.merkle_root ?? undefined,
    digitalSignature: row.digital_signature ?? undefined,
    templateId: row.template_id ?? undefined,
    metadata: parseJson<Record<string, string> | null>(row.metadata_json, null) ?? undefined,
  };
}

export function mapBlockRow(row: BlockRow) {
  return {
    height: Number(row.height),
    hash: row.hash,
    previousHash: row.previous_hash,
    merkleRoot: row.merkle_root,
    timestamp: row.timestamp,
    validator: row.validator,
    transactionCount: Number(row.transaction_count),
    size: Number(row.size),
  };
}

export function mapTransactionRow(row: TransactionRow) {
  return {
    id: row.id,
    blockHeight: Number(row.block_height),
    type: row.type,
    timestamp: row.timestamp,
    from: row.from_address,
    to: row.to_address,
    credentialId: row.credential_id ?? undefined,
    status: row.status,
    gasUsed: row.gas_used === null ? undefined : Number(row.gas_used),
    confirmations: Number(row.confirmations),
  };
}

export function mapAuditRow(row: AuditRow) {
  return {
    id: row.id,
    action: row.action,
    actor: row.actor,
    actorRole: row.actor_role,
    target: row.target,
    targetType: row.target_type,
    details: row.details ?? undefined,
    ipAddress: row.ip_address,
    timestamp: row.timestamp,
  };
}

export function mapAlertRow(row: SecurityAlertRow) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

export function mapRiskAssessmentRow(row: RiskAssessmentRow) {
  return {
    id: row.id,
    credentialId: row.credential_id,
    riskLevel: row.risk_level,
    score: Number(row.score),
    flags: parseJson<string[]>(row.flags_json, []),
    assessedAt: row.assessed_at,
    method: row.method,
  };
}

export function mapVerificationHistoryRow(row: VerificationHistoryRow) {
  return {
    id: row.id,
    credentialId: row.credential_id,
    credentialTitle: row.credential_title,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    result: row.result,
    method: row.method,
    ipAddress: row.ip_address ?? undefined,
  };
}