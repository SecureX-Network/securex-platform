import { IS_MOCK } from '@/constants';
import { mockDelay } from '@/services/mock';
import { ApiError } from '@/services/api/client';
import { getFraudAlerts as getPlatformFraudAlerts } from '@/services/api/adminService';

import type {
  FraudDashboard,
  FraudEvent,
  Investigation,
  TamperAnalysis,
} from '../types/fraud';
import type { RiskAssessment } from '@/types';

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

  const risks = await getPlatformFraudAlerts();
  return buildRealDashboard(risks);
}

function riskSeverity(level: RiskAssessment['riskLevel']): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  return level;
}

function riskStatus(level: RiskAssessment['riskLevel']): FraudEvent['status'] {
  switch (level) {
    case 'CRITICAL':
    case 'HIGH':
      return 'OPEN';
    case 'MEDIUM':
      return 'INVESTIGATING';
    default:
      return 'RESOLVED';
  }
}

/**
 * Composes the Fraud & Tampering dashboard from the platform ledger's risk
 * assessments (GET /admin/security/fraud). No Fraud Engine endpoint contract
 * has been provided to this frontend, so the dashboard is derived entirely
 * from ledger analysts the platform already serves.
 */
function buildRealDashboard(risks: RiskAssessment[]): FraudDashboard {
  const severityDistribution = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(
    (severity) => ({
      severity,
      count: risks.filter((risk) => risk.riskLevel === severity).length,
    }),
  );

  const byDay = new Map<string, { scores: number[]; count: number }>();
  for (const risk of risks) {
    const day = risk.assessedAt.slice(0, 10);
    const bucket = byDay.get(day) ?? { scores: [], count: 0 };
    bucket.scores.push(risk.score);
    bucket.count += 1;
    byDay.set(day, bucket);
  }
  const riskTrend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, bucket]) => ({
      timestamp: `${day}T00:00:00.000Z`,
      riskScore: Math.round(bucket.scores.reduce((sum, value) => sum + value, 0) / bucket.scores.length),
      detections: bucket.count,
    }));

  const recentEvents: FraudEvent[] = risks.slice(0, 12).map((risk) => ({
    id: `${risk.id}-event`,
    severity: riskSeverity(risk.riskLevel),
    status: riskStatus(risk.riskLevel),
    credentialId: risk.credentialId,
    issuer: risk.method,
    timestamp: risk.assessedAt,
    title: `${risk.method} analysis`,
    summary: risk.flags.length > 0 ? risk.flags.join(' | ') : `Risk score ${risk.score}.`,
  }));

  const highRisk = risks.filter((risk) => risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL');
  const suspicious = risks.filter((risk) => risk.riskLevel !== 'LOW');

  return {
    mode: 'REAL',
    counts: {
      documentsAnalyzed: risks.length,
      suspiciousCases: suspicious.length,
      highRiskCases: highRisk.length,
      fingerprintChecks: risks.length,
    },
    severityDistribution,
    recentEvents,
    riskTrend,
    engine: {
      status: 'UP',
      checkedAt:
        risks.length > 0
          ? risks.map((risk) => risk.assessedAt).sort()[risks.length - 1] ?? new Date().toISOString()
          : new Date().toISOString(),
      message:
        'Fraud signals derived from the platform ledger risk assessments (GET /admin/security/fraud).',
    },
  };
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