import type {
  FraudAnalysisResult,
  FraudDashboardStats,
  RiskFactor,
  SuspiciousCredential,
  TamperingIndicator,
} from '../types';

function iso(daysAgo: number, hoursAgo = 0): string {
  const DAY = 86_400_000;
  return new Date(Date.now() - daysAgo * DAY - hoursAgo * 3_600_000).toISOString();
}

function makeHex(seed: number, length = 64): string {
  const chars = '0123456789abcdef';
  let state = seed % 2_147_483_647;
  let out = '';
  for (let i = 0; i < length; i++) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_647;
    out += chars.charAt(state % 16);
  }
  return out;
}

const DEMO_RISK_FACTORS: RiskFactor[] = [
  {
    id: 'rf-001',
    severity: 'HIGH',
    title: 'Fingerprint mismatch',
    explanation:
      'The computed document fingerprint does not match the expected value stored on the blockchain, indicating possible content modification.',
    evidence: 'Computed: a3f8c1...d42e vs Expected: 7b1e92...f0a3',
    affectedArea: 'Document body',
    recommendedAction: 'Compare the original document with the submitted version.',
  },
  {
    id: 'rf-002',
    severity: 'CRITICAL',
    title: 'Structural anomaly detected',
    explanation:
      'The PDF structure contains unusual object references and cross-reference table entries that are inconsistent with standard document generation.',
    evidence: 'Unusual XRef entries at offset 0x4A2F',
    affectedArea: 'PDF internal structure',
    recommendedAction: 'Request the original source document from the issuer.',
  },
  {
    id: 'rf-003',
    severity: 'MEDIUM',
    title: 'Metadata inconsistency',
    explanation:
      'Document metadata fields (creator, modification date) are inconsistent with the claimed issuer and issuance timeline.',
    evidence: 'Creator: Adobe Acrobat Pro (modified 2025-03-12); Claimed issuer date: 2024-01-15',
    affectedArea: 'Document metadata',
    recommendedAction: 'Verify the metadata against issuer records.',
  },
  {
    id: 'rf-004',
    severity: 'LOW',
    title: 'No blockchain evidence available',
    explanation:
      'The fraud engine could not retrieve blockchain verification evidence for this credential. This may indicate the credential has not been anchored.',
    evidence: 'Blockchain provider returned UNAVAILABLE',
    affectedArea: 'Blockchain verification',
    recommendedAction: 'Contact the issuer to confirm blockchain anchoring.',
  },
  {
    id: 'rf-005',
    severity: 'HIGH',
    title: 'Digital signature invalid',
    explanation:
      'The embedded digital signature could not be verified against the issuer public key.',
    evidence: 'Signature verification: FAILED (Ed25519)',
    affectedArea: 'Cryptographic signature',
    recommendedAction: 'Request re-verification from the issuing institution.',
  },
];

const DEMO_TAMPERING_INDICATORS: TamperingIndicator[] = [
  {
    id: 'ti-001',
    type: 'STRUCTURAL',
    severity: 'CRITICAL',
    title: 'PDF cross-reference table modified',
    description: 'The cross-reference table contains entries that were modified after initial document generation.',
    evidence: 'XRef inconsistency at byte offset 18,472',
    affectedArea: 'PDF structure',
  },
  {
    id: 'ti-002',
    type: 'FINGERPRINT',
    severity: 'HIGH',
    title: 'Document hash does not match anchored record',
    description: 'The SHA-256 hash of the submitted document differs from the hash recorded on the blockchain.',
    evidence: 'Hash mismatch: submitted a3f8c1... vs anchored 7b1e92...',
    affectedArea: 'Document integrity',
  },
  {
    id: 'ti-003',
    type: 'METADATA',
    severity: 'MEDIUM',
    title: 'Suspicious modification timestamp',
    description: 'The document modification date postdates the claimed issuance date by more than 180 days.',
    evidence: 'Last modified: 2025-03-12; Claimed issuance: 2024-01-15',
    affectedArea: 'Document metadata',
  },
];

export const MOCK_FRAUD_ANALYSIS_RESULT: FraudAnalysisResult = {
  id: 'analysis-001',
  fileName: 'DEMO-CREDENTIAL-001.pdf',
  fileType: 'application/pdf',
  fileSize: 245_760,
  analyzedAt: iso(0, 1),
  riskLevel: 'CRITICAL',
  riskScore: 87,
  riskFactors: DEMO_RISK_FACTORS,
  tamperingIndicators: DEMO_TAMPERING_INDICATORS,
  fingerprint: {
    algorithm: 'SHA-256',
    computed: `a3f8c1d9e4b2f7a6c8d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1${makeHex(9999, 0).slice(0, 0)}d42e`,
    expected: '7b1e92a4c6f8d0b3e5a7c9f1d3b5e7a9c1d3f5b7e9a1c3d5f7b9a1c3d5f7b9',
    match: false,
  },
  blockchainEvidence: {
    status: 'DEMO',
    blockHeight: 15,
    blockHash: `0x${makeHex(30_001)}`,
    transactionId: `0x${makeHex(40_001)}`,
    credentialId: 'SX-EF4B-390A-7C58',
    timestamp: iso(30),
    detail: 'Demo blockchain evidence — not from a live node.',
  },
  summary:
    'Deterministic risk analysis identified multiple integrity indicators. The document exhibits structural anomalies, a fingerprint mismatch, and metadata inconsistencies that collectively indicate a high probability of tampering.',
  recommendedAction:
    'This document should not be trusted. Request the original from the issuing institution and verify directly on the SecureX blockchain.',
  dataSource: 'DEMO',
};

const MOCK_RISK_FACTORS_LOW: RiskFactor[] = [
  {
    id: 'rf-low-001',
    severity: 'LOW',
    title: 'No anomalies detected',
    explanation: 'The document structure, metadata, and fingerprint are consistent with expected values.',
    evidence: 'All checks passed',
    affectedArea: 'N/A',
    recommendedAction: 'No action required.',
  },
];

export const MOCK_FRAUD_ANALYSIS_LOW: FraudAnalysisResult = {
  id: 'analysis-002',
  fileName: 'DEMO-CREDENTIAL-002.pdf',
  fileType: 'application/pdf',
  fileSize: 189_440,
  analyzedAt: iso(0, 3),
  riskLevel: 'LOW',
  riskScore: 5,
  riskFactors: MOCK_RISK_FACTORS_LOW,
  tamperingIndicators: [],
  fingerprint: {
    algorithm: 'SHA-256',
    computed: 'e5a2f3b8c1d6e9a0f4b7c2d5e8a1f3b6c9d0e2a5f8b1c4d7e0a3f6b9c2d5e8',
    expected: 'e5a2f3b8c1d6e9a0f4b7c2d5e8a1f3b6c9d0e2a5f8b1c4d7e0a3f6b9c2d5e8',
    match: true,
  },
  blockchainEvidence: {
    status: 'DEMO',
    blockHeight: 18,
    blockHash: `0x${makeHex(30_002)}`,
    transactionId: `0x${makeHex(40_002)}`,
    credentialId: 'SX-2F9C-A41B-8D7E',
    timestamp: iso(5),
    detail: 'Demo blockchain evidence — not from a live node.',
  },
  summary:
    'Deterministic risk analysis found no integrity indicators. The document fingerprint matches the anchored record and no structural or metadata anomalies were detected.',
  recommendedAction: 'Document appears authentic based on available analysis.',
  dataSource: 'DEMO',
};

export const MOCK_SUSPICIOUS_CREDENTIALS: SuspiciousCredential[] = [
  {
    id: 'sc-001',
    credentialId: 'SX-EF4B-390A-7C58',
    title: 'Professional Certificate in Data Analytics',
    holderName: 'Daniel Kim',
    issuerName: 'MIT Professional Education',
    riskLevel: 'CRITICAL',
    riskScore: 95,
    flags: ['Digital signature mismatch', 'Merkle proof verification failed'],
    lastCheckedAt: iso(0, 2),
    status: 'UNDER_REVIEW',
  },
  {
    id: 'sc-002',
    credentialId: 'SX-83E1-0FA6-4B92',
    title: 'AWS Certified Developer – Associate',
    holderName: 'Anna Kowalski',
    issuerName: 'AWS Certification Compliance Team',
    riskLevel: 'HIGH',
    riskScore: 82,
    flags: ['Anomalous issuance pattern detected', 'Issuer signing key flagged for rotation'],
    lastCheckedAt: iso(0, 5),
    status: 'UNDER_REVIEW',
  },
  {
    id: 'sc-003',
    credentialId: 'SX-16A5-E9B2-7C40',
    title: 'AWS Certified Solutions Architect – Associate',
    holderName: 'Daniel Kim',
    issuerName: 'AWS Certification Compliance Team',
    riskLevel: 'MEDIUM',
    riskScore: 55,
    flags: ['Credential revoked by issuer'],
    lastCheckedAt: iso(1),
    status: 'CONFIRMED_FRAUD',
  },
  {
    id: 'sc-004',
    credentialId: 'SX-4B8F-C1D6-29A3',
    title: 'IEEE Certified Software Development Professional',
    holderName: 'Monica Patel',
    issuerName: 'IEEE Computer Society',
    riskLevel: 'MEDIUM',
    riskScore: 38,
    flags: ['Credential has exceeded its validity period'],
    lastCheckedAt: iso(2),
    status: 'DISMISSED',
  },
  {
    id: 'sc-005',
    credentialId: 'SX-F7C3-58E0-1D9A',
    title: 'Professional Certificate in Project Management',
    holderName: "James O'Brien",
    issuerName: 'Georgia Tech Registrar',
    riskLevel: 'MEDIUM',
    riskScore: 45,
    flags: ['Credential temporarily suspended pending review'],
    lastCheckedAt: iso(1, 6),
    status: 'PENDING',
  },
];

export const MOCK_FRAUD_DASHBOARD_STATS: FraudDashboardStats = {
  documentsAnalyzed: 24,
  suspiciousCases: 3,
  highRiskCases: 2,
  tamperingDetections: 1,
  fingerprintChecks: 18,
  riskDistribution: {
    low: 15,
    medium: 4,
    high: 3,
    critical: 2,
  },
  recentAnalyses: [MOCK_FRAUD_ANALYSIS_RESULT, MOCK_FRAUD_ANALYSIS_LOW],
};

export const ANALYSIS_STAGES = [
  { key: 'PREPARING', label: 'Preparing document', detail: 'Reading file and validating format...' },
  { key: 'VALIDATING', label: 'Validating file', detail: 'Checking magic bytes and file integrity...' },
  { key: 'STRUCTURAL', label: 'Analyzing document integrity', detail: 'Inspecting internal structure...' },
  { key: 'FINGERPRINT', label: 'Checking fingerprint', detail: 'Computing and comparing hash...' },
  { key: 'BLOCKCHAIN', label: 'Checking trust evidence', detail: 'Querying blockchain provider...' },
  { key: 'RISK', label: 'Calculating risk', detail: 'Running deterministic risk analysis...' },
  { key: 'COMPLETE', label: 'Preparing result', detail: 'Compiling analysis report...' },
] as const;
