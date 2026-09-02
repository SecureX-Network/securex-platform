import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileSearch,
  Radar,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
} from '@/components/ui';
import { MOCK_RISK_ASSESSMENTS, MOCK_SECURITY_ALERTS } from '@/services/mock';

const severityStyles: Record<string, string> = {
  CRITICAL: 'bg-danger-50 text-danger-700 ring-danger-600/20',
  HIGH: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  MEDIUM: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  LOW: 'bg-securex-50 text-securex-700 ring-securex-600/20',
};

export default function AdminSecurityPage() {
  const score = useMemo(() => {
    const alerts = MOCK_SECURITY_ALERTS;
    const active = alerts.filter(
      (a) => !['RESOLVED', 'DISMISSED'].includes(a.status),
    ).length;
    const criticalWeight = alerts.filter((a) => a.severity === 'CRITICAL').length;
    const highWeight = alerts.filter((a) => a.severity === 'HIGH').length;
    const raw = 100 - active * 8 - criticalWeight * 10 - highWeight * 4;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, []);

  const summaries = useMemo(() => {
    const bySeverity = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(
      (severity) => ({
        severity,
        count: MOCK_SECURITY_ALERTS.filter((a) => a.severity === severity)
          .length,
      }),
    );
    const active = MOCK_SECURITY_ALERTS.filter(
      (a) => a.status === 'NEW' || a.status === 'ACKNOWLEDGED',
    ).length;
    return { bySeverity, active };
  }, []);

  const threatActive = summaries.active > 0;
  const recentSuspect = useMemo(
    () => MOCK_RISK_ASSESSMENTS.slice(0, 3),
    [],
  );

  const scoreTone =
    score >= 80
      ? 'text-trust-600 border-trust-200 bg-trust-50'
      : score >= 60
        ? 'text-warning-600 border-warning-200 bg-warning-50'
        : 'text-danger-600 border-danger-200 bg-danger-50';

  const scoreLabel =
    score >= 80
      ? 'Strong'
      : score >= 60
        ? 'Moderate'
        : 'Needs attention';

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-neutral-900">Security Center</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fraud detection monitoring and threat intelligence. <span className="font-medium text-neutral-700">Demo data only.</span>
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">Security Score</p>
          <p
            className={`my-3 flex h-28 w-28 items-center justify-center rounded-full border-4 text-3xl font-bold ${scoreTone}`}
          >
            {score}
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
              Alerts by Severity
            </h2>
          </div>
          <ul className="space-y-3">
            {summaries.bySeverity.map((item) => (
              <li key={item.severity} className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[item.severity]}`}
                >
                  {item.severity}
                </span>
                <span className="text-sm font-semibold text-neutral-800">
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Radar className="h-4 w-4 text-securex-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Threat Detection
            </h2>
          </div>
          <div className="flex items-start gap-3">
            {threatActive ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
                <ShieldAlert className="h-5 w-5" />
              </span>
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-50 text-trust-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            )}
            <div>
              <p className="font-medium text-neutral-900">
                {threatActive ? 'Active threats detected' : 'No active threats'}
              </p>
              <p className="text-sm text-neutral-500">
                {summaries.active} uninvestigated{' '}
                {summaries.active === 1 ? 'alert' : 'alerts'} across the network.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
            <Bot className="h-4 w-4 text-neutral-400" />
            ML ensemble monitoring is actively scoring verifications.
          </div>
        </Card>
      </section>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-danger-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Recent Suspicious Activity
            </h2>
          </div>
          <Link
            to="/admin/security/audit"
            className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
          >
            View audit log <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentSuspect.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            No suspicious activity detected.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recentSuspect.map((assessment) => (
              <li key={assessment.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                  <FileSearch className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {assessment.credentialId}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {assessment.method} \u00b7 risk score {assessment.score}
                  </p>
                  {assessment.flags.length > 0 && (
                    <p className="mt-1 text-xs text-neutral-600">
                      {assessment.flags.join(' \u00b7 ')}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${severityStyles[assessment.riskLevel]}`}
                >
                  {assessment.riskLevel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Quick Links
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/admin/security/alerts"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-800">Security Alerts</p>
              <p className="text-xs text-neutral-500">Triage incidents</p>
            </div>
          </Link>
          <Link
            to="/admin/security/audit"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
              <ScrollText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-800">Audit Log</p>
              <p className="text-xs text-neutral-500">Review actions</p>
            </div>
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-800">User Access</p>
              <p className="text-xs text-neutral-500">Manage roles</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
