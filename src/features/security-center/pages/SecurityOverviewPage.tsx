import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSearch,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { Card, Badge, Skeleton, ModeIndicator } from '@/components/ui';
import { formatDate } from '@/utils';
import { severityStyles } from '@/constants/badges';
import {
  getSecurityOverview,
  getSecurityAlerts,
  getRiskAssessments,
  getCredentialIntegrityStats,
} from '../services/securityCenterService';
import type { SecurityOverviewData } from '../types/security';
import type { SecurityAlert, RiskAssessment } from '@/types';
import type { CredentialIntegrityStats } from '../types/security';

const severityBadgeVariant: Record<string, 'danger' | 'warning' | 'info'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'warning',
  LOW: 'info',
};

export default function SecurityOverviewPage() {
  const [overview, setOverview] = useState<SecurityOverviewData | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [credStats, setCredStats] = useState<CredentialIntegrityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [ov, al, ra, cs] = await Promise.all([
        getSecurityOverview(),
        getSecurityAlerts(),
        getRiskAssessments(),
        getCredentialIntegrityStats(),
      ]);
      setOverview(ov);
      setAlerts(al);
      setRisks(ra);
      setCredStats(cs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security overview');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const scoreTone = useMemo(() => {
    if (!overview) return '';
    if (overview.securityScore >= 80)
      return 'text-trust-600 border-trust-200 bg-trust-50';
    if (overview.securityScore >= 60)
      return 'text-warning-600 border-warning-200 bg-warning-50';
    return 'text-danger-600 border-danger-200 bg-danger-50';
  }, [overview]);

  const scoreLabel = useMemo(() => {
    if (!overview) return '';
    if (overview.securityScore >= 80) return 'Strong';
    if (overview.securityScore >= 60) return 'Moderate';
    return 'Needs attention';
  }, [overview]);

  const severityCounts = useMemo(() => {
    const active = alerts.filter(
      (a) => !['RESOLVED', 'DISMISSED'].includes(a.status),
    );
    return {
      CRITICAL: active.filter((a) => a.severity === 'CRITICAL').length,
      HIGH: active.filter((a) => a.severity === 'HIGH').length,
      MEDIUM: active.filter((a) => a.severity === 'MEDIUM').length,
      LOW: active.filter((a) => a.severity === 'LOW').length,
    };
  }, [alerts]);

  const recentAlerts = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [alerts],
  );

  const recentRisks = useMemo(
    () =>
      [...risks]
        .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())
        .slice(0, 3),
    [risks],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-danger-600" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-danger-900">
              Unable to load Security Center
            </h1>
            <p className="mt-2 text-sm text-danger-800">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!overview || !credStats) return null;

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Security Center</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Platform security posture, alerts, and threat monitoring.
            </p>
          </div>
          <ModeIndicator />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">Security Score</p>
          <p
            className={`my-3 flex h-28 w-28 items-center justify-center rounded-full border-4 text-3xl font-bold ${scoreTone}`}
          >
            {overview.securityScore}
          </p>
          <p className="text-sm font-medium text-neutral-700">{scoreLabel}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Based on active alerts, severity, and open incidents.
          </p>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-danger-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Active Alerts
            </h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neutral-900">
              {overview.activeAlerts}
            </span>
            <span className="text-sm text-neutral-500">total active</span>
          </div>
          <ul className="mt-4 space-y-2">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <li key={sev} className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[sev]}`}
                >
                  {sev}
                </span>
                <span className="text-sm font-semibold text-neutral-800">
                  {severityCounts[sev]}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-securex-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Activity Summary
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800">
                  {overview.suspiciousEvents24h} suspicious events
                </p>
                <p className="text-xs text-neutral-500">In the last 24 hours</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-50 text-trust-600">
                <Fingerprint className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800">
                  {overview.verificationsToday} verifications
                </p>
                <p className="text-xs text-neutral-500">Today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-securex-50 text-securex-600">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800">
                  {overview.credentialsMonitored} credentials monitored
                </p>
                <p className="text-xs text-neutral-500">Across all issuers</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-securex-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Credential Integrity
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-trust-50 p-3 text-center">
              <p className="text-2xl font-bold text-trust-700">{credStats.valid}</p>
              <p className="text-xs font-medium text-trust-600">Valid</p>
            </div>
            <div className="rounded-lg bg-danger-50 p-3 text-center">
              <p className="text-2xl font-bold text-danger-700">{credStats.revoked}</p>
              <p className="text-xs font-medium text-danger-600">Revoked</p>
            </div>
            <div className="rounded-lg bg-warning-50 p-3 text-center">
              <p className="text-2xl font-bold text-warning-700">{credStats.expired}</p>
              <p className="text-xs font-medium text-warning-600">Expired</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{credStats.tampered}</p>
              <p className="text-xs font-medium text-red-600">Tampered</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{credStats.suspicious}</p>
              <p className="text-xs font-medium text-amber-600">Suspicious</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-danger-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Recent Risk Assessments
            </h2>
          </div>
          {recentRisks.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">
              No risk assessments available.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentRisks.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                    <FileSearch className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {r.credentialId}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {r.method} · score {r.score}
                    </p>
                    {r.flags.length > 0 && (
                      <p className="mt-1 text-xs text-neutral-600">
                        {r.flags.join(' · ')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${severityStyles[r.riskLevel]}`}
                  >
                    {r.riskLevel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-securex-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Recent Alerts
            </h2>
          </div>
          <Link
            to="/security/alerts"
            className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentAlerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            No active alerts.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recentAlerts.map((alert) => (
              <li key={alert.id} className="flex items-start gap-3 py-3">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-danger-50 text-danger-600'
                      : alert.severity === 'HIGH'
                        ? 'bg-warning-50 text-warning-600'
                        : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {alert.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {alert.source} · {formatDate(alert.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={severityBadgeVariant[alert.severity] ?? 'info'} size="sm">
                    {alert.severity}
                  </Badge>
                  <Badge
                    variant={
                      alert.status === 'NEW'
                        ? 'danger'
                        : alert.status === 'INVESTIGATING'
                          ? 'info'
                          : 'default'
                    }
                    size="sm"
                  >
                    {alert.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Quick Navigation
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/security/alerts"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-800">Alerts</p>
              <p className="text-xs text-neutral-500">Triage incidents</p>
            </div>
          </Link>
          <Link
            to="/security/events"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-800">Events</p>
              <p className="text-xs text-neutral-500">Security activity log</p>
            </div>
          </Link>
          <Link
            to="/security/settings"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-800">Status</p>
              <p className="text-xs text-neutral-500">System health</p>
            </div>
          </Link>
          <Link
            to="/fraud"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <FileSearch className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-800">Fraud & Tampering</p>
              <p className="text-xs text-neutral-500">Detailed analysis</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
