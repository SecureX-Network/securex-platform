import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Building2,
  CreditCard,
  ScrollText,
  ShieldAlert,
  Users,
  UserCog,
} from 'lucide-react';
import { Card, ModeIndicator, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getAdminStats, getAuditEvents, getSecurityAlerts } from '@/services/api/adminService';
import { ActivityFeed } from '@/features/activity/components/ActivityFeed';
import { getActivity } from '@/features/activity/services/activityService';
import { severityStyles } from '@/constants/badges';
import { formatDate } from '@/utils';
import type { AdminStats } from '@/services/api/adminService';
import type { AuditEvent, SecurityAlert } from '@/types';
import type { ActivityItem } from '@/features/activity/services/activityService';

export function OperatorsHome() {
  const { user } = useAuth();
  const role = user?.role ?? 'ADMIN';
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[] | null>(null);
  const [audit, setAudit] = useState<AuditEvent[] | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, alertsData, auditData, act] = await Promise.all([
        getAdminStats().catch(() => null),
        getSecurityAlerts().catch(() => []),
        getAuditEvents().catch(() => []),
        getActivity(role, user?.id ?? '', undefined).catch(() => []),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
      setAudit(auditData);
      setActivity(act);
    } finally {
      setLoading(false);
    }
  }, [role, user?.id]);

  useEffect(() => { void load(); }, [load]);

  const activeAlerts = (alerts ?? []).filter((a) => !['RESOLVED', 'DISMISSED'].includes(a.status)).slice(0, 4);
  const recentAudit = (audit ?? []).slice(0, 4);
  const firstName = user?.name?.split(' ')[0] ?? 'operator';

  const isAuditor = role === 'AUDITOR';

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Home</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Welcome back, {firstName}. Platform status, security posture and activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-trust-500" />
            </span>
            <span className="font-medium text-neutral-700">All systems operational</span>
          </span>
          <ModeIndicator />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {loading ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />) : [
            { label: 'Institutions', value: stats?.totalInstitutions ?? '—', icon: Building2, accent: 'bg-neutral-100 text-neutral-600' },
            { label: 'Users', value: stats?.totalUsers ?? '—', icon: Users, accent: 'bg-securex-50 text-securex-600' },
            { label: 'Issuers', value: stats?.totalIssuers ?? '—', icon: UserCog, accent: 'bg-purple-50 text-purple-600' },
            { label: 'Credentials', value: stats?.totalCredentials ?? '—', icon: CreditCard, accent: 'bg-trust-50 text-trust-600' },
            { label: 'Verifications', value: stats?.totalVerifications ?? '—', icon: Activity, accent: 'bg-sky-50 text-sky-600' },
            { label: 'Active Alerts', value: stats?.activeAlerts ?? '—', icon: ShieldAlert, accent: 'bg-danger-50 text-danger-600' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} padding="sm" className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.accent}`}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">{card.label}</p>
                  <p className="text-xl font-bold text-neutral-900">{card.value}</p>
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
            { label: 'Users', icon: Users, to: '/admin/users' },
            { label: 'Institutions', icon: Building2, to: '/admin/institutions' },
            { label: 'Security Center', icon: ShieldAlert, to: '/security' },
            { label: 'Audit Log', icon: ScrollText, to: '/admin/security/audit' },
          ].map((a) => {
            const Icon = a.icon;
            const show = !(isAuditor && a.to === '/admin/users');
            if (!show) return null;
            return (
              <Link key={a.label} to={a.to} className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-securex transition-colors hover:border-securex-200 hover:bg-securex-50/40">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-securex-50 text-securex-600"><Icon className="h-5 w-5" /></span>
                <span className="text-xs font-medium text-neutral-700">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <Card className="lg:col-span-2 2xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-danger-600" />
              <h2 className="text-base font-semibold text-neutral-900">Active Security Alerts</h2>
            </div>
            <Link to="/security/alerts" className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {loading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div> : activeAlerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">No active security alerts.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {activeAlerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 py-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">{alert.title}</p>
                    <p className="text-xs text-neutral-500">{alert.source} · {formatDate(alert.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${severityStyles[alert.severity]}`}>{alert.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="2xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-securex-600" />
              <h2 className="text-base font-semibold text-neutral-900">Audit Activity</h2>
            </div>
            <Link to="/admin/security/audit" className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {loading ? <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div> : recentAudit.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">No recent audit events.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentAudit.map((event) => (
                <li key={event.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500"><Activity className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">{event.action.replace(/_/g, ' ')}</p>
                    <p className="truncate text-xs text-neutral-500">{event.actor} · {event.target}</p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">{formatDate(event.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="2xl:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
            <Link to="/activity" className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ActivityFeed items={activity.slice(0, 4)} loading={loading} compact emptyMessage="No recent activity." />
        </div>
      </div>
    </div>
  );
}