import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, FileCheck, QrCode, Search, ShieldAlert } from 'lucide-react';
import { Card, EmptyState, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getVerificationHistory } from '@/services/api/verificationService';
import { ActivityFeed } from '@/features/activity/components/ActivityFeed';
import { getActivity } from '@/features/activity/services/activityService';
import { formatDate } from '@/utils';
import type { VerificationHistory } from '@/types';
import type { ActivityItem } from '@/features/activity/services/activityService';

export function EmployerHome() {
  const { user } = useAuth();
  const employerId = user?.id ?? 'usr-employer-001';
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hist, act] = await Promise.all([
        getVerificationHistory(employerId).catch(() => []),
        getActivity('EMPLOYER', employerId).catch(() => []),
      ]);
      setHistory(hist);
      setActivity(act);
    } finally {
      setLoading(false);
    }
  }, [employerId]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    total: history.length,
    verified: history.filter((h) => h.result === 'VALID').length,
    suspicious: history.filter((h) => h.result === 'SUSPICIOUS' || h.result === 'REVOKED' || h.result === 'TAMPERED').length,
  }), [history]);

  const recent = useMemo(() => history.slice(0, 5), [history]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Home</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Check a
          candidate's credential or review past verifications.
        </p>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {loading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />) : [
            { label: 'Total Verifications', value: stats.total, icon: FileCheck, accent: 'bg-securex-50 text-securex-600' },
            { label: 'Verified', value: stats.verified, icon: CheckCircle2, accent: 'bg-trust-50 text-trust-600' },
            { label: 'Suspicious / Revoked', value: stats.suspicious, icon: ShieldAlert, accent: 'bg-danger-50 text-danger-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} padding="sm" className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.accent}`}><Icon className="h-5 w-5" /></span>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Verify a Credential', icon: QrCode, to: '/verify-credential' },
            { label: 'Verification History', icon: Activity, to: '/verification-history' },
            { label: 'Public Verifier', icon: Search, to: '/verify' },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.label} to={a.to} className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-securex transition-colors hover:border-securex-200 hover:bg-securex-50/40">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-securex-50 text-securex-600"><Icon className="h-5 w-5" /></span>
                <span className="text-xs font-medium text-neutral-700">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Recent Verifications</h2>
            <Link to="/verification-history" className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {loading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div> : recent.length === 0 ? (
            <EmptyState compact title="No verifications yet" description="Verified credentials will appear here." />
          ) : (
            <Card padding="none" className="divide-y divide-neutral-100">
              {recent.map((h) => (
                <div key={h.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${h.result === 'VALID' ? 'bg-trust-50 text-trust-600' : h.result === 'REVOKED' ? 'bg-danger-50 text-danger-600' : 'bg-warning-50 text-warning-600'}`}><Activity className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-800">{h.credentialTitle}</p>
                    <p className="text-xs text-neutral-500">Verified by {h.verifiedBy} · {h.method.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">{formatDate(h.verifiedAt)}</span>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
            <Link to="/activity" className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ActivityFeed items={activity.slice(0, 4)} loading={loading} compact emptyMessage="No recent activity." />
        </section>
      </div>
    </div>
  );
}