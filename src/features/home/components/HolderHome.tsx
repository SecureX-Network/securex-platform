import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertTriangle,
  Share2,
} from 'lucide-react';
import { Card, CredentialCard, EmptyState, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getHolderCredentials } from '@/services/api/credentialService';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { ActivityFeed } from '@/features/activity/components/ActivityFeed';
import { getActivity } from '@/features/activity/services/activityService';
import type { Credential } from '@/types';
import type { ActivityItem } from '@/features/activity/services/activityService';

export function HolderHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const holderId = user?.id ?? 'usr-holder-001';
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const { unreadCount } = useNotifications();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [creds, act] = await Promise.all([
        getHolderCredentials(holderId).catch(() => [] as Credential[]),
        getActivity('HOLDER', holderId).catch(() => []),
      ]);
      setCredentials(creds);
      setActivity(act);
    } finally {
      setLoading(false);
    }
  }, [holderId]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const total = credentials.length;
    const active = credentials.filter((c) => c.status === 'VALID').length;
    const expiring = credentials.filter((c) => {
      if (!c.expiresAt) return false;
      const diff = new Date(c.expiresAt).getTime() - Date.now();
      return diff > 0 && diff < 30 * 86_400_000;
    }).length;
    const revoked = credentials.filter((c) => c.status === 'REVOKED' || c.status === 'SUSPENDED').length;
    return { total, active, expiring, revoked };
  }, [credentials]);

  const recent = useMemo(() => credentials.slice(0, 3), [credentials]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Home</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Welcome back, {firstName}. Your credential wallet and activity at a glance.
        </p>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : (
            [
              { label: 'Total Credentials', value: stats.total, icon: CreditCard, accent: 'bg-securex-50 text-securex-600' },
              { label: 'Active', value: stats.active, icon: CheckCircle2, accent: 'bg-trust-50 text-trust-600' },
              { label: 'Expiring Soon', value: stats.expiring, icon: Clock, accent: 'bg-warning-50 text-warning-600' },
              { label: 'Revoked / Suspended', value: stats.revoked, icon: AlertTriangle, accent: 'bg-danger-50 text-danger-600' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} padding="sm" className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">{card.label}</p>
                    <p className="text-xl font-bold text-neutral-900">{card.value}</p>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'My Credentials', icon: CreditCard, to: '/credentials' },
            { label: 'Share Credential', icon: Share2, to: '/share' },
            { label: 'Verify', icon: Camera, action: () => navigate('/verify') },
            { label: 'Notifications', icon: Bell, to: '/notifications', badge: unreadCount > 0 ? `${unreadCount}` : undefined },
          ].map((a) => {
            const Icon = a.icon;
            const content = (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-securex transition-colors hover:border-securex-200 hover:bg-securex-50/40 relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-securex-50 text-securex-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-neutral-700">{a.label}</span>
                {a.badge && (
                  <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                    {a.badge}
                  </span>
                )}
              </div>
            );
            return a.to ? (
              <Link key={a.label} to={a.to}>{content}</Link>
            ) : (
              <button key={a.label} type="button" onClick={a.action} className="text-left">{content}</button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Recent Credentials</h2>
            <Link to="/credentials" className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          ) : recent.length === 0 ? (
            <EmptyState compact title="No credentials yet" description="You don't have any credentials in your wallet yet." />
          ) : (
            <div className="space-y-3">
              {recent.map((c) => (
                <CredentialCard
                  key={c.id}
                  title={c.title}
                  credentialType={c.type}
                  issuer={c.institutionName}
                  status={c.status}
                  issuedAt={c.issuedAt}
                  expiresAt={c.expiresAt}
                  credentialId={c.credentialId}
                  onClick={() => navigate(`/credentials/${c.id}`)}
                />
              ))}
            </div>
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