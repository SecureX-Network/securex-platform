import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  FileSearch,
  Fingerprint,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';

import type {
  FraudDashboard,
  FraudEvent,
  FraudSeverity,
} from '../types/fraud';
import { getFraudDashboard } from '../services/fraudTamperingService';

const severityOrder: FraudSeverity[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

function severityClass(severity: FraudSeverity) {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-green-100 text-green-800';
  }
}

function statusClass(status: FraudEvent['status']) {
  switch (status) {
    case 'OPEN':
      return 'bg-red-100 text-red-800';
    case 'INVESTIGATING':
      return 'bg-yellow-100 text-yellow-800';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function FraudDashboardPage() {
  const [dashboard, setDashboard] = useState<FraudDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const result = await getFraudDashboard();
      setDashboard(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load fraud dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-80 rounded bg-slate-200" />
          <div className="h-5 w-2/3 rounded bg-slate-200" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-xl bg-slate-200"
              />
            ))}
          </div>

          <div className="h-72 rounded-xl bg-slate-200" />
          <div className="h-72 rounded-xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6"
        >
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-0.5 text-red-600" />

            <div className="flex-1">
              <h1 className="text-lg font-semibold text-red-900">
                Unable to load Fraud Dashboard
              </h1>

              <p className="mt-2 text-sm text-red-800">{error}</p>

              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <FileSearch className="mx-auto h-10 w-10 text-slate-400" />

        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          No fraud dashboard data
        </h1>

        <p className="mt-2 text-slate-500">
          No dashboard information is currently available.
        </p>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="mt-5 rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
        >
          Retry
        </button>
      </main>
    );
  }

  const maxSeverity =
    Math.max(
      ...dashboard.severityDistribution.map((item) => item.count),
      1,
    );

  const maxRisk =
    Math.max(...dashboard.riskTrend.map((item) => item.riskScore), 1);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-9 w-9 text-blue-600" />

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Fraud &amp; Tampering
              </h1>
            </div>

            <p className="mt-3 max-w-3xl text-slate-600">
              Analyze digital credentials for integrity indicators,
              suspicious characteristics, and available trust evidence.
            </p>
          </div>

          <div
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              dashboard.mode === 'DEMO'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {dashboard.mode}
          </div>
        </div>

        {dashboard.mode === 'DEMO' && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="font-semibold text-amber-900">
                  Demonstration mode
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  Results shown here are synthetic DEMO data. They are not
                  production fraud statistics or live blockchain verification
                  results.
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Detection counts */}
      <section
        aria-labelledby="detection-counts"
        className="mb-8"
      >
        <h2 id="detection-counts" className="sr-only">
          Detection counts
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Documents Analyzed"
            value={dashboard.counts.documentsAnalyzed}
            description="Documents inspected"
            icon={<FileSearch className="h-6 w-6" />}
          />

          <StatCard
            label="Suspicious Cases"
            value={dashboard.counts.suspiciousCases}
            description="Cases requiring attention"
            icon={<AlertTriangle className="h-6 w-6" />}
          />

          <StatCard
            label="High Risk"
            value={dashboard.counts.highRiskCases}
            description="High-risk detections"
            icon={<ShieldCheck className="h-6 w-6" />}
          />

          <StatCard
            label="Fingerprint Checks"
            value={dashboard.counts.fingerprintChecks}
            description="Backend-reported checks"
            icon={<Fingerprint className="h-6 w-6" />}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Severity distribution */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Severity Distribution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current detection distribution by severity.
            </p>
          </div>

          <div className="space-y-5">
            {severityOrder.map((severity) => {
              const item = dashboard.severityDistribution.find(
                (entry) => entry.severity === severity,
              );

              const count = item?.count ?? 0;
              const width = (count / maxSeverity) * 100;

              return (
                <div key={severity}>
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(
                        severity,
                      )}`}
                    >
                      {severity}
                    </span>

                    <span className="text-sm font-semibold text-slate-700">
                      {count}
                    </span>
                  </div>

                  <div
                    className="h-3 overflow-hidden rounded-full bg-slate-100"
                    aria-label={`${severity}: ${count}`}
                  >
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Engine status */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Fraud Engine Status
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest available engine status.
              </p>
            </div>

            <Server className="h-6 w-6 text-slate-400" />
          </div>

          <div className="mt-8 flex items-center gap-4">
            <span
              className={`h-4 w-4 rounded-full ${
                dashboard.engine.status === 'UP'
                  ? 'bg-green-500'
                  : dashboard.engine.status === 'DEGRADED'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              aria-hidden="true"
            />

            <div>
              <p className="text-2xl font-bold text-slate-950">
                {dashboard.engine.status}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {dashboard.engine.message}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-4 text-sm text-slate-500">
            Last checked: {formatDate(dashboard.engine.checkedAt)}
          </div>
        </section>
      </div>

      {/* Risk trend */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-blue-600" />

          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Risk / Detection Trend
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Risk score and detection activity over the available period.
            </p>
          </div>
        </div>

        {dashboard.riskTrend.length === 0 ? (
          <div className="mt-6 rounded-lg bg-slate-50 p-8 text-center text-slate-500">
            No trend data available.
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {dashboard.riskTrend.map((point) => {
              const width = (point.riskScore / maxRisk) * 100;

              return (
                <div key={point.timestamp}>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-slate-500">
                      {formatDate(point.timestamp)}
                    </span>

                    <span className="font-semibold text-slate-800">
                      Risk {point.riskScore} · {point.detections} detections
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent events */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Recent Fraud Events
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Recently reported detection events.
          </p>
        </div>

        {dashboard.recentEvents.length === 0 ? (
          <div className="p-10 text-center">
            <FileSearch className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 font-medium text-slate-700">
              No fraud events found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              There are no recent events to display.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Event</th>
                  <th className="px-6 py-4 font-semibold">Severity</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Credential</th>
                  <th className="px-6 py-4 font-semibold">Issuer</th>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {dashboard.recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {event.title}
                      </p>

                      <p className="mt-1 max-w-xs text-slate-500">
                        {event.summary}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(
                          event.severity,
                        )}`}
                      >
                        {event.severity}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          event.status,
                        )}`}
                      >
                        {event.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {event.credentialId}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {event.issuer}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                      {formatDate(event.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}