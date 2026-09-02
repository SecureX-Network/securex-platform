import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  Clock,
  FileCheck,
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
        color: 'bg-securex-50 text-securex-600',
      },
      {
        label: 'Active Issuers',
        value: stats.activeIssuers,
        icon: Building2,
        color: 'bg-trust-50 text-trust-600',
      },
      {
        label: 'Pending Issues',
        value: stats.credentialsIssuedThisMonth,
        icon: Clock,
        color: 'bg-warning-50 text-warning-600',
      },
      {
        label: 'Verifications',
        value: stats.verificationCount.toLocaleString(),
        icon: ShieldCheck,
        color: 'bg-purple-50 text-purple-600',
      },
    ];
  }, [stats]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'text-trust-600 bg-trust-50';
      case 'REVOKED':
        return 'text-danger-600 bg-danger-50';
      case 'SUSPENDED':
        return 'text-warning-600 bg-warning-50';
      case 'EXPIRED':
        return 'text-neutral-600 bg-neutral-100';
      default:
        return 'text-neutral-600 bg-neutral-100';
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-securex-600 text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {loading ? (
                <Skeleton className="h-7 w-48" />
              ) : (
                `Welcome, ${institution?.name ?? 'Institution'}`
              )}
            </h1>
            <p className="text-sm text-neutral-500">
              Overview of your institution's credentials and activity.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-neutral-900">
                        {stat.value}
                      </p>
                    </div>
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </Card>
              );
            })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="Recent Activity"
          description="Latest credential issuances"
          className="lg:col-span-2"
          padding="none"
        >
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : recentCredentials.length === 0 ? (
            <p className="p-5 text-sm text-neutral-500">No recent activity.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentCredentials.map((cred, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {cred.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Issued to {cred.holderName}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(cred.status)}`}
                    >
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
        </Card>

        <Card title="Quick Actions" padding="md">
          <div className="space-y-3">
            {[
              {
                label: 'Issue Credential',
                icon: Award,
                to: '/institution/issue',
              },
              {
                label: 'View Credentials',
                icon: FileCheck,
                to: '/institution/credentials',
              },
              {
                label: 'Manage Issuers',
                icon: Building2,
                to: '/institution/issuers',
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-sm font-medium text-neutral-700">
                      {action.label}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-400" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <Card padding="md">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Analytics Coming Soon
            </h3>
            <p className="text-xs text-neutral-500">
              Detailed charts and analytics for credential issuance trends, verification
              patterns, and issuer performance will be available here.
            </p>
          </div>
        </div>
        <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60">
          <p className="text-sm text-neutral-400">
            Charts and analytics coming soon
          </p>
        </div>
      </Card>
    </div>
  );
}
