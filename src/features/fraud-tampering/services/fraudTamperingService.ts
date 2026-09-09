import { IS_MOCK } from '@/constants';
import { mockDelay } from '@/services/mock';
import { ApiError } from '@/services/api/client';

import type {
  FraudDashboard,
  FraudEvent,
  Investigation,
  TamperAnalysis,
} from '../types/fraud';

const DEMO_DASHBOARD: FraudDashboard = {
  mode: 'DEMO',

  counts: {
    documentsAnalyzed: 24,
    suspiciousCases: 3,
    highRiskCases: 2,
    fingerprintChecks: 18,
  },

  severityDistribution: [
    { severity: 'LOW', count: 9 },
    { severity: 'MEDIUM', count: 7 },
    { severity: 'HIGH', count: 5 },
    { severity: 'CRITICAL', count: 3 },
  ],

  recentEvents: [
    {
      id: 'demo-fraud-001',
      severity: 'HIGH',
      status: 'OPEN',
      credentialId: 'cred-demo-001',
      issuer: 'SecureX University',
      timestamp: '2026-09-04T12:00:00.000Z',
      title: 'Credential integrity warning',
      summary: 'Synthetic demonstration event.',
    },
    {
      id: 'demo-fraud-002',
      severity: 'MEDIUM',
      status: 'INVESTIGATING',
      credentialId: 'cred-demo-002',
      issuer: 'SecureX Institute',
      timestamp: '2026-09-04T10:30:00.000Z',
      title: 'Suspicious credential signal',
      summary: 'Synthetic demonstration event.',
    },
    {
      id: 'demo-fraud-003',
      severity: 'LOW',
      status: 'RESOLVED',
      credentialId: 'cred-demo-003',
      issuer: 'SecureX Academy',
      timestamp: '2026-09-03T16:15:00.000Z',
      title: 'Verification anomaly reviewed',
      summary: 'Synthetic demonstration event.',
    },
  ],

  riskTrend: [
    {
      timestamp: '2026-08-31T00:00:00.000Z',
      riskScore: 22,
      detections: 2,
    },
    {
      timestamp: '2026-09-01T00:00:00.000Z',
      riskScore: 31,
      detections: 3,
    },
    {
      timestamp: '2026-09-02T00:00:00.000Z',
      riskScore: 28,
      detections: 2,
    },
    {
      timestamp: '2026-09-03T00:00:00.000Z',
      riskScore: 46,
      detections: 4,
    },
    {
      timestamp: '2026-09-04T00:00:00.000Z',
      riskScore: 39,
      detections: 3,
    },
  ],

  engine: {
    status: 'UP',
    checkedAt: '2026-09-04T12:00:00.000Z',
    message: 'Synthetic DEMO engine status.',
  },
};

export async function getFraudDashboard(): Promise<FraudDashboard> {
  if (IS_MOCK) {
    await mockDelay();
    return DEMO_DASHBOARD;
  }

  /*
   * REAL Fraud Engine integration is intentionally not guessed here.
   *
   * The repository currently exposes FRAUD_ENGINE_URL, but no verified
   * Fraud Engine V2 endpoint contract was provided to this frontend.
   *
   * Do not invent an endpoint.
   */
  throw new ApiError(
    'Fraud Engine REAL API endpoint contract is not available to this frontend.',
    503,
  );
}

export async function analyzeCredential(
  credentialId: string,
): Promise<TamperAnalysis> {
  if (IS_MOCK) {
    await mockDelay();

    return {
      credentialId,
      result: 'EXACT',
      severity: 'LOW',
      riskScore: 8,
      details: 'Synthetic DEMO analysis result.',
      evidence: [
        'Synthetic fingerprint comparison',
        'Synthetic credential integrity signal',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  throw new ApiError(
    'Fraud Engine REAL analysis endpoint contract is not available.',
    503,
  );
}

export async function getFraudEvents(): Promise<FraudEvent[]> {
  if (IS_MOCK) {
    await mockDelay();
    return DEMO_DASHBOARD.recentEvents;
  }

  throw new ApiError(
    'Fraud Engine REAL events endpoint contract is not available.',
    503,
  );
}

export async function getInvestigations(): Promise<Investigation[]> {
  if (IS_MOCK) {
    await mockDelay();

    return [
      {
        id: 'investigation-demo-001',
        title: 'Credential integrity review',
        status: 'IN_PROGRESS',
        severity: 'HIGH',
        credentialId: 'cred-demo-001',
        issuer: 'SecureX University',
        createdAt: '2026-09-03T09:00:00.000Z',
        updatedAt: '2026-09-04T11:00:00.000Z',
        evidence: [
          'Synthetic tampering indicator',
          'Synthetic verification history',
        ],
      },
    ];
  }

  throw new ApiError(
    'Fraud Engine REAL investigations endpoint contract is not available.',
    503,
  );
}