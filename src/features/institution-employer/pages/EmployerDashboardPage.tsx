import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  FileCheck,
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getVerificationHistory } from '@/services/api/verificationService';
import { formatDate } from '@/utils/format';
import type { VerificationHistory } from '@/types';

export default function EmployerDashboardPage() {
  const { user } = useAuth();
  const employerId = user?.id ?? 'usr-employer-001';
  const navigate = useNavigate();

  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVerificationHistory(employerId);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [employerId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const stats = useMemo(
    () => ({
      total: history.length,
      verifiedToday: history.filter(
        (h) =>
          new Date(h.verifiedAt).toDateString() === new Date().toDateString(),
      ).length,
      suspicious: history.filter(
        (h) =>
          h.result === 'SUSPICIOUS' ||
          h.result === 'REVOKED' ||
          h.result === 'TAMPERED',
      ).length,
    }),
    [history],
  );

  const recent = useMemo(() => history.slice(0, 5), [history]);

  const statCards = [
    {
      label: 'Total Verifications',
      value: stats.total,
      icon: FileCheck,
      color: 'bg-securex-50 text-securex-600',
    },
    {
      label: 'Verified Today',
      value: stats.verifiedToday,
      icon: ShieldCheck,
      color: 'bg-trust-50 text-trust-600',
    },
    {
      label: 'Suspicious Findings',
      value: stats.suspicious,
      icon: ShieldAlert,
      color: 'bg-danger-50 text-danger-600',
    },
    {
      label: 'Candidates',
      value: history.length,
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  const resultColor = (result: string) => {
    switch (result) {
      case 'VALID':
        return 'text-trust-600';
      case 'SUSPENDED':
      case 'SUSPICIOUS':
        return 'text-warning-600';
      case 'REVOKED':
      case 'TAMPERED':
        return 'text-danger-600';
      default:
        return 'text-neutral-600';
    }
  };

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/employer/verify?credentialId=${encodeURIComponent(search.trim())}`);
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
              Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-sm text-neutral-500">
              Hiring pipeline insights and recent credential verifications.
            </p>
          </div>
        </div>
      </section>

      <Card padding="lg" className="bg-gradient-to-br from-securex-600 to-securex-800 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Quick Verify</h2>
            <p className="text-sm text-securex-100">
              Verify a candidate credential instantly against the SecureX ledger.
            </p>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            <form onSubmit={handleQuickVerify} className="flex w-full gap-2">
              <Input
                placeholder="Enter credential ID (e.g. SX-2F9C-A41B-8D7E)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/95"
                leftIcon={<Search className="h-4 w-4" />}
              />
              <Button type="submit" size="sm" variant="secondary">
                Verify
              </Button>
            </form>
          </div>
        </div>
      </Card>

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
          title="Recent Verifications"
          description="Latest credential checks"
          className="lg:col-span-2"
          padding="none"
        >
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              compact
              icon={<FileCheck className="h-6 w-6" />}
              title="No verifications yet"
              description="Verified credentials will appear here."
            />
          ) : (
            <div className="divide-y divide-neutral-100">
              {recent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {item.credentialTitle}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {item.credentialId} · {item.method}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold ${resultColor(item.result)}`}
                    >
                      {item.result}
                    </span>
                    <span className="whitespace-nowrap text-xs text-neutral-400">
                      {formatDate(item.verifiedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-neutral-100 px-5 py-3">
            <Link
              to="/employer/history"
              className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
            >
              View full history <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <Card title="Actions" padding="md">
          <div className="space-y-3">
            <Link
              to="/employer/verify"
              className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
                <ScanSearch className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-neutral-700">
                Verify a Credential
              </span>
            </Link>
            <Link
              to="/employer/history"
              className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                <FileCheck className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-neutral-700">
                View History
              </span>
            </Link>
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
              Activity Chart Coming Soon
            </h3>
            <p className="text-xs text-neutral-500">
              Visualization of verification volume and results over time.
            </p>
          </div>
        </div>
        <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60">
          <p className="text-sm text-neutral-400">
            Charts coming soon
          </p>
        </div>
      </Card>
    </div>
  );
}