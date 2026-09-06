export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FingerprintAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

export type BlockchainEvidenceStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'FAILED'
  | 'DEMO';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnalysisStage =
  | 'PREPARING'
  | 'VALIDATING'
  | 'STRUCTURAL'
  | 'FINGERPRINT'
  | 'BLOCKCHAIN'
  | 'RISK'
  | 'COMPLETE';

export type SupportedFileType = 'application/pdf' | 'image/png' | 'image/jpeg';

export type DataSourceMode = 'REAL' | 'DEMO';

export interface RiskFactor {
  id: string;
  severity: Severity;
  title: string;
  explanation: string;
  evidence?: string;
  affectedArea?: string;
  recommendedAction?: string;
}

export interface FingerprintInfo {
  algorithm: FingerprintAlgorithm;
  computed: string;
  expected?: string;
  match: boolean;
}

export interface BlockchainEvidence {
  status: BlockchainEvidenceStatus;
  blockHeight?: number;
  blockHash?: string;
  transactionId?: string;
  credentialId?: string;
  timestamp?: string;
  detail?: string;
}

export interface TamperingIndicator {
  id: string;
  type: 'STRUCTURAL' | 'METADATA' | 'FINGERPRINT' | 'SIGNATURE' | 'LIFECYCLE';
  severity: Severity;
  title: string;
  description: string;
  evidence?: string;
  affectedArea?: string;
}

export interface FraudAnalysisResult {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  analyzedAt: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: RiskFactor[];
  tamperingIndicators: TamperingIndicator[];
  fingerprint: FingerprintInfo;
  blockchainEvidence: BlockchainEvidence;
  summary: string;
  recommendedAction: string;
  dataSource: DataSourceMode;
}

export interface FraudDashboardStats {
  documentsAnalyzed: number;
  suspiciousCases: number;
  highRiskCases: number;
  tamperingDetections: number;
  fingerprintChecks: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recentAnalyses: FraudAnalysisResult[];
}

export interface SuspiciousCredential {
  id: string;
  credentialId: string;
  title: string;
  holderName: string;
  issuerName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  flags: string[];
  lastCheckedAt: string;
  status: 'UNDER_REVIEW' | 'CONFIRMED_FRAUD' | 'DISMISSED' | 'PENDING';
}
