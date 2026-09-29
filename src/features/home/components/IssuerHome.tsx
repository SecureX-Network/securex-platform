import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  Clock,
  FileCheck,
  Fingerprint,
  ShieldCheck,
  Stamp,
} from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  getInstitutionById,
  getInstitutionStats,
  type InstitutionStats,
} from '@/services/api/institutionService';
import { getCredentials } from '@/services/api/credentialService';
import { ActivityFeed } from '@/features/activity/components/ActivityFeed';
import { getActivity } from '@/features/activity/services/activityService';
import { formatDate } from '@/utils/format';
import { getStatusBadgeVariant, getStatusLabel } from '@/utils/status';
import type { Credential, Institution } from '@/types';
import type { ActivityItem } from '@/features/activity/services/activityService';

/**
 * Issuer workspace home.
 *
 * The platform's `users` record has no link to an issuer entity, so an ISSUER
 * account cannot be narrowed to the credentials of one specific issuer — the
 * API scopes ISSUER to the whole institution. This page therefore presents the
 * institution's credentials and says so, rather than claiming a per-issuer
 * split the backend cannot produce.
 */
export function IssuerHome() {
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? 'inst-stanford';
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [stats, setStats] = useState<InstitutionStats | null>(null);
  const [recentCreds, setRecentCreds] = useState<Credential[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [inst, st, creds, act] = await Promise.all([
        getInstitutionById(institutionId).catch(() => null),
        getInstitutionStats(institutionId).catch(() => null),
        getCredentials().catch(() => []),
        getActivity('ISSUER', user?.id ?? '', institutionId).catch(() => []),
      ]);
      setInstitution(inst);
      setStats(st);
      setRecentCreds(
        creds
          .filter((c) => c.institutionId === institutionId)
          .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
          .slice(0, 5),
      );
      setActivity(act);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="space-y-8">
        <ErrorState
          title="Failed to load home"
          description="There was a problem loading your workspace data. Please try again."
          onRetry={load}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white px-6 py-7 shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-securex-100/40 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-securex-600 to-indigo-700 text-white shadow-lg shadow-securex-600/20">
              <Stamp className="h-7 w-7" />
            </span>
            <div>
              <span className="mb-1 inline-block rounded-full border border-trust-200 bg-trust-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-trust-700">
                Issuer Workspace
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
                {loading ? (
                  <Skeleton className="h-9 w-64" />
                ) : (
                  institution?.name ?? 'Issuer'
                )}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Issue credentials to holders and track how they are being verified.
              </p>
            </div>
          </div>
          <Link
            to="/institution/issue"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-securex-700 hover:shadow-securex-600/20"
          >
            <Award className="h-4 w-4" /> Issue Credential{' '}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-securex-600">
            Overview
          </p>
          <h2 className="mt-1 text-lg font-bold text-neutral-950">
            Credential ecosystem
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))
            : [
                {
                  label: 'Total Credentials',
                  value: stats?.totalCredentials ?? '—',
                  icon: FileCheck,
                  accent: 'bg-securex-50 text-securex-600',
                },
                {
                  label: 'Active Issuers',
                  value: stats?.activeIssuers ?? '—',
                  icon: Building2,
                  accent: 'bg-trust-50 text-trust-600',
                },
                {
                  label: 'Issued This Month',
                  value: stats?.credentialsIssuedThisMonth ?? '—',
                  icon: Clock,
                  accent: 'bg-warning-50 text-warning-600',
                },
                {
                  label: 'Verifications',
                  value: stats?.verificationCount?.toLocaleString() ?? '—',
                  icon: ShieldCheck,
                  accent: 'bg-purple-50 text-purple-600',
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} padding="sm" className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-500">{stat.label}</p>
                      <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
                    </div>
                  </Card>
                );
              })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Issue Credential', icon: Award, to: '/institution/issue' },
            { label: 'Credentials', icon: FileCheck, to: '/institution/credentials' },
            { label: 'Holders', icon: Building2, to: '/institution/holders' },
            { label: 'Templates', icon: FileCheck, to: '/institution/templates' },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                to={a.to}
                className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-securex transition-colors hover:border-securex-200 hover:bg-securex-50/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-securex-50 text-securex-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-neutral-700">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Recently Issued
            </h2>
            <Link
              to="/institution/credentials"
              className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : recentCreds.length === 0 ? (
            <EmptyState
              compact
              title="No credentials yet"
              description="Credentials issued by your organisation will appear here."
            />
          ) : (
            <Card padding="none" className="divide-y divide-neutral-100">
              {recentCreds.map((c) => (
                <div
                  key={c.id}
                  className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-neutral-50/80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-securex-50 text-securex-600 transition-colors group-hover:bg-securex-100">
                      <Fingerprint className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-800">
                        {c.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        Issued to {c.holderName} · {c.issuerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-13 sm:pl-0">
                    <Badge variant={getStatusBadgeVariant(c.status)} size="sm" dot>
                      {getStatusLabel(c.status)}
                    </Badge>
                    <span className="whitespace-nowrap text-xs text-neutral-400">
                      {formatDate(c.issuedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          )}
          {!loading && recentCreds.length > 0 && (
            <p className="mt-2 text-xs text-neutral-400">
              Your account is scoped to {institution?.name ?? 'your organisation'}.
              Individual issuer attribution is not available on this platform.
            </p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
            <Link
              to="/activity"
              className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ActivityFeed
            items={activity.slice(0, 4)}
            loading={loading}
            compact
            emptyMessage="No recent activity."
          />
        </section>
      </div>
    </div>
  );
}
