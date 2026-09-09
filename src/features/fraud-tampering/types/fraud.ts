export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FraudStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'DISMISSED';

export type TamperResult =
  | 'EXACT'
  | 'TAMPERED'
  | 'UNVERIFIABLE';

export interface FraudDetectionCounts {
  documentsAnalyzed: number;
  suspiciousCases: number;
  highRiskCases: number;
  fingerprintChecks: number;
}

export interface SeverityDistribution {
  severity: FraudSeverity;
  count: number;
}

export interface FraudEvent {
  id: string;
  severity: FraudSeverity;
  status: FraudStatus;
  credentialId: string;
  issuer: string;
  timestamp: string;
  title: string;
  summary: string;
}

export interface FraudRiskTrend {
  timestamp: string;
  riskScore: number;
  detections: number;
}

export interface FraudEngineStatus {
  status: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  checkedAt: string;
  message: string;
}

export interface FraudDashboard {
  mode: 'DEMO' | 'REAL';
  counts: FraudDetectionCounts;
  severityDistribution: SeverityDistribution[];
  recentEvents: FraudEvent[];
  riskTrend: FraudRiskTrend[];
  engine: FraudEngineStatus;
}

export interface TamperAnalysis {
  credentialId: string;
  result: TamperResult;
  severity: FraudSeverity;
  riskScore: number | null;
  details: string;
  evidence: string[];
  timestamp: string;
}

export interface FraudEvidence {
  documentHash: string | null;
  publicCredentialId: string | null;
  verificationResult: string | null;
  blockchainProof: string | null;
  transactionId: string | null;
  blockHeight: number | null;
  blockHash: string | null;
  timestamp: string;
}

export interface Investigation {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  severity: FraudSeverity;
  credentialId: string;
  issuer: string;
  createdAt: string;
  updatedAt: string;
  evidence: string[];
}