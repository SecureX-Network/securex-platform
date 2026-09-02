import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CreditCard,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import {
  Card,
  Skeleton,
} from '@/components/ui';
import { getAdminStats } from '@/services/api/adminService';
import { MOCK_AUDIT_EVENTS, MOCK_SECURITY_ALERTS } from '@/services/mock';
import type { AdminStats } from '@/services/api/adminService';
import { formatDate } from '@/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  linkTo?: string;
}

function StatCard({ label, value, icon, accent, linkTo }: StatCardProps) {
  const content = (
    <Card padding="sm" className="flex items-center gap-4 transition-colors hover:border-neutral-300">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-neutral-500">{label}</p>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
      </div>
    </Card>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }
  return content;
}

const severityBadge: Record<string, string> = {
  CRITICAL: 'bg-danger-50 text-danger-700 ring-danger-600/20',
  HIGH: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  MEDIUM: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  LOW: 'bg-securex-50 text-securex-700 ring-securex-600/20',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAdminStats()
      .then((data) => active && setStats(data))
      .catch(() => active && setStats(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const recentAlerts = MOCK_SECURITY_ALERTS.filter(
    (a) => !['RESOLVED', 'DISMISSED'].includes(a.status),
  ).slice(0, 4);
  const recentAudit = MOCK_AUDIT_EVENTS.slice(0, 4);

  const statsCards: StatCardProps[] = [
    {
      label: 'Institutions',
      value: stats?.totalInstitutions ?? '\u2014',
      icon: <Building2 className="h-6 w-6 text-neutral-600" />,
      accent: 'bg-neutral-100 text-neutral-600',
      linkTo: '/admin/institutions',
    },
    {
      label: 'Users',
      value: stats?.totalUsers ?? '\u2014',
      icon: <Users className="h-6 w-6 text-securex-600" />,
      accent: 'bg-securex-50 text-securex-600',
      linkTo: '/admin/users',
    },
    {
      label: 'Issuers',
      value: stats?.totalCredentials ? '13' : '\u2014',
      icon: <UserCog className="h-6 w-6 text-purple-600" />,
      accent: 'bg-purple-50 text-purple-600',
      linkTo: '/admin/issuers',
    },
    {
      label: 'Credentials',
      value: stats?.totalCredentials ?? '\u2014',
      icon: <CreditCard className="h-6 w-6 text-trust-600" />,
      accent: 'bg-trust-50 text-trust-600',
    },
    {
      label: 'Verifications',
      value: stats?.totalVerifications ?? '\u2014',
      icon: <Activity className="h-6 w-6 text-sky-600" />,
      accent: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Active Alerts',
      value: stats?.activeAlerts ?? '\u2014',
      icon: <ShieldAlert className="h-6 w-6 text-danger-600" />,
      accent: 'bg-danger-50 text-danger-600',
      linkTo: '/admin/security/alerts',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Platform Overview
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Network health, user growth, and security posture at a glance. All
            values below are <span className="font-medium">demo data</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-trust-500" />
          </span>
          <span className="font-medium text-neutral-700">All systems operational</span>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))
            : statsCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-danger-600" />
              <h2 className="text-base font-semibold text-neutral-900">
                Recent Security Alerts
              </h2>
            </div>
            <Link
              to="/admin/security/alerts"
              className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">
              No active security alerts.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentAlerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {alert.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {alert.source} \u00b7 {formatDate(alert.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${severityBadge[alert.severity]}`}
                  >
                    {alert.severity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-securex-600" />
              <h2 className="text-base font-semibold text-neutral-900">
                Recent Audit Events
              </h2>
            </div>
            <Link
              to="/admin/security/audit"
              className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">
              No recent audit events.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentAudit.map((event) => (
                <li key={event.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {event.action.replace(/_/g, ' ')}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {event.actor} \u00b7 {event.target}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatDate(event.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-securex-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Quick Links
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label: 'Institutions', to: '/admin/institutions', icon: Building2 },
              { label: 'Issuers', to: '/admin/issuers', icon: UserCog },
              { label: 'Users', to: '/admin/users', icon: Users },
              { label: 'Security Alerts', to: '/admin/security/alerts', icon: ShieldAlert },
              { label: 'Audit Log', to: '/admin/security/audit', icon: ScrollText },
              { label: 'Security Center', to: '/admin/security', icon: ShieldCheck },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-securex-200 hover:bg-securex-50/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-neutral-800">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
