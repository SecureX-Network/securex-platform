import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck,
  Fingerprint,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

import { Card, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { InstitutionStats } from '@/services/api/institutionService';
import {
  getInstitutionById,
  getInstitutionStats,
} from '@/services/api/institutionService';
import { getCredentials } from '@/services/api/credentialService';
import { formatDate } from '@/utils/format';
import type { Institution } from '@/types';

export default function InstitutionDashboardPage() {
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? 'inst-stanford';

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [stats, setStats] = useState<InstitutionStats | null>(null);
  const [recentCredentials, setRecentCredentials] = useState<
    { title: string; holderName: string; status: string; issuedAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [inst, st, creds] = await Promise.all([
        getInstitutionById(institutionId),
        getInstitutionStats(institutionId),
        getCredentials(),
      ]);

      setInstitution(inst);
      setStats(st);

      const instCreds = creds
        .filter((c) => c.institutionId === institutionId)
        .sort(
          (a, b) =>
            new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
        )
        .slice(0, 5)
        .map((c) => ({
          title: c.title,
          holderName: c.holderName,
          status: c.status,
          issuedAt: c.issuedAt,
        }));

      setRecentCredentials(instCreds);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const statCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: 'Total Credentials',
        value: stats.totalCredentials,
        icon: FileCheck,
        accent: 'bg-securex-50 text-securex-600',
      },
      {
        label: 'Active Issuers',
        value: stats.activeIssuers,
        icon: Building2,
        accent: 'bg-trust-50 text-trust-600',
      },
      {
        label: 'Issued This Month',
        value: stats.credentialsIssuedThisMonth,
        icon: Clock,
        accent: 'bg-warning-50 text-warning-600',
      },
      {
        label: 'Total Verifications',
        value: stats.verificationCount.toLocaleString(),
        icon: ShieldCheck,
        accent: 'bg-purple-50 text-purple-600',
      },
    ];
  }, [stats]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'bg-trust-50 text-trust-700 border-trust-100';
      case 'REVOKED':
        return 'bg-danger-50 text-danger-700 border-danger-100';
      case 'SUSPENDED':
        return 'bg-warning-50 text-warning-700 border-warning-100';
      case 'EXPIRED':
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* -------------------------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white px-6 py-7 shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-securex-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-purple-100/30 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-securex-600 to-indigo-700 text-white shadow-lg shadow-securex-600/20">
              <Building2 className="h-7 w-7" />
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full border border-trust-200 bg-trust-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-trust-700">
                  Institution Portal
                </span>

                <span className="hidden items-center gap-1 text-xs text-neutral-400 sm:flex">
                  <CheckCircle2 className="h-3.5 w-3.5 text-trust-500" />
                  Secure environment
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
                {loading ? (
                  <Skeleton className="h-9 w-64" />
                ) : (
                  institution?.name ?? 'Institution'
                )}
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                Manage credentials, issuers and verification activity from one
                secure workspace.
              </p>
            </div>
          </div>

          <Link
            to="/institution/issue"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-securex-700 hover:shadow-securex-600/20"
          >
            <Award className="h-4 w-4" />
            Issue Credential
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* STATS */}
      {/* -------------------------------------------------- */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-securex-600">
              Overview
            </p>
            <h2 className="mt-1 text-lg font-bold text-neutral-950">
              Credential ecosystem
            </h2>
          </div>

          <div className="hidden items-center gap-1.5 text-xs text-trust-600 sm:flex">
            <span className="h-2 w-2 rounded-full bg-trust-500" />
            System operational
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))
            : statCards.map((stat) => {
                const Icon = stat.icon;

                return (
                  <Card
                    key={stat.label}
                    padding="md"
                    className="group overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-securex-200 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                          {stat.label}
                        </p>

                        <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">
                          {stat.value}
                        </p>

                        <div className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400">
                          <TrendingUp className="h-3.5 w-3.5 text-trust-500" />
                          Platform metric
                        </div>
                      </div>

                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.accent} transition-transform duration-200 group-hover:scale-110`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                  </Card>
                );
              })}
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* ACTIVITY + QUICK ACTIONS */}
      {/* -------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Activity */}
        <Card
          title="Recent Credential Activity"
          description="Latest credentials issued by your institution"
          className="overflow-hidden rounded-2xl border-neutral-200 shadow-sm xl:col-span-2"
          padding="none"
        >
          {loading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : recentCredentials.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                <FileCheck className="h-6 w-6" />
              </div>

              <p className="text-sm font-semibold text-neutral-700">
                No recent activity
              </p>

              <p className="mt-1 max-w-sm text-xs text-neutral-400">
                Credentials issued by your institution will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentCredentials.map((cred, idx) => (
                <div
                  key={idx}
                  className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-neutral-50/80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-securex-50 text-securex-600 transition-colors group-hover:bg-securex-100">
                      <Fingerprint className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-800">
                        {cred.title}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        Issued to {cred.holderName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-13 sm:pl-0">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${statusColor(
                        cred.status,
                      )}`}
                    >
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {cred.status}
                    </span>

                    <span className="whitespace-nowrap text-xs text-neutral-400">
                      {formatDate(cred.issuedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && recentCredentials.length > 0 && (
            <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
              <Link
                to="/institution/credentials"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-securex-600 transition-colors hover:text-securex-700"
              >
                View all credentials
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card
          title="Quick Actions"
          description="Common institution tasks"
          className="rounded-2xl border-neutral-200 shadow-sm"
          padding="md"
        >
          <div className="space-y-3">
            {[
              {
                label: 'Issue Credential',
                description: 'Create and issue a new credential',
                icon: Award,
                to: '/institution/issue',
              },
              {
                label: 'View Credentials',
                description: 'Browse your credential registry',
                icon: FileCheck,
                to: '/institution/credentials',
              },
              {
                label: 'Manage Issuers',
                description: 'Control authorized issuers',
                icon: Building2,
                to: '/institution/issuers',
              },
            ].map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-securex-200 hover:bg-securex-50/30 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-securex-100 group-hover:text-securex-600">
                      <Icon className="h-4.5 w-4.5" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800">
                        {action.label}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-1 group-hover:text-securex-600" />
                </Link>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-securex-100 bg-gradient-to-br from-securex-50 to-indigo-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-securex-600 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-bold text-neutral-800">
                  Secure issuance
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                  Credentials are managed through SecureX's trusted
                  verification infrastructure.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* -------------------------------------------------- */}
      {/* ANALYTICS */}
      {/* -------------------------------------------------- */}
      <Card
        padding="none"
        className="overflow-hidden rounded-2xl border-neutral-200 shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-neutral-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold text-neutral-900">
                Analytics & Insights
              </p>
              <p className="text-xs text-neutral-500">
                Credential and verification performance
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Coming Soon
          </span>
        </div>

        <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-securex-50/30">
          <div className="absolute inset-0 opacity-40">
            <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:32px_32px]" />
          </div>

          <div className="relative text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-securex-500 shadow-sm ring-1 ring-neutral-200">
              <TrendingUp className="h-5 w-5" />
            </div>

            <p className="text-sm font-semibold text-neutral-700">
              Advanced analytics are on the way
            </p>

            <p className="mt-1 max-w-md text-xs text-neutral-400">
              Track issuance trends, verification patterns and issuer
              performance from one centralized analytics workspace.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}