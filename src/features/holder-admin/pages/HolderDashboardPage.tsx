import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Card, CredentialCard, EmptyState, ModeIndicator, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getHolderCredentials } from '@/services/api/credentialService';
import { MOCK_NOTIFICATIONS, MOCK_VERIFICATION_HISTORY } from '@/services/mock';
import type { Credential } from '@/types';
import { formatDate } from '@/utils';

export default function HolderDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const holderId = user?.id ?? 'usr-holder-001';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolderCredentials(holderId);
      setCredentials(data);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [holderId]);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const stats = useMemo(() => {
    const total = credentials.length;
    const active = credentials.filter((c) => c.status === 'VALID').length;
    const expiringSoon = credentials.filter((c) => {
      if (!c.expiresAt) return false;
      const diff = new Date(c.expiresAt).getTime() - Date.now();
      return diff > 0 && diff < 30 * 86_400_000;
    }).length;
    const revoked = credentials.filter(
      (c) => c.status === 'REVOKED' || c.status === 'SUSPENDED',
    ).length;
    return { total, active, expiringSoon, revoked };
  }, [credentials]);

  const unreadCount = useMemo(
    () => MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
    [],
  );

  const recentCredentials = useMemo(() => credentials.slice(0, 3), [credentials]);

  const recentActivity = useMemo(
    () =>
      MOCK_VERIFICATION_HISTORY.filter((v) =>
        credentials.some((c) => c.credentialId === v.credentialId),
      ).slice(0, 3),
    [credentials],
  );

  const recentNotifications = useMemo(() => MOCK_NOTIFICATIONS.slice(0, 3), []);

  const quickActions = [
    {
      label: 'View Credentials',
      icon: CreditCard,
      to: '/holder/credentials',
    },
    {
      label: 'Share Credential',
      icon: Share2,
      to: '/holder/share',
    },
    {
      label: 'Verify',
      icon: Camera,
      action: () => navigate('/verify'),
    },
    {
      label: 'Notifications',
      icon: Bell,
      to: '/holder/notifications',
    },
  ];

  const statCards = [
    {
      label: 'Total Credentials',
      value: stats.total,
      icon: CreditCard,
      accent: 'bg-securex-50 text-securex-600',
    },
    {
      label: 'Active',
      value: stats.active,
      icon: CheckCircle2,
      accent: 'bg-trust-50 text-trust-600',
    },
    {
      label: 'Expiring Soon',
      value: stats.expiringSoon,
      icon: Clock,
      accent: 'bg-warning-50 text-warning-600',
    },
    {
      label: 'Revoked / Suspended',
      value: stats.revoked,
      icon: AlertTriangle,
      accent: 'bg-danger-50 text-danger-600',
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-securex-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Welcome back, {firstName}
              </h1>
              <p className="text-sm text-neutral-500">
                Your credential wallet at a glance.
              </p>
            </div>
          </div>
          <ModeIndicator />
        </div>
      </section>

      <section>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} padding="sm" className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">{card.label}</p>
                    <p className="text-xl font-bold text-neutral-900">{card.value}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const content = (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-securex transition-colors hover:border-securex-200 hover:bg-securex-50/40">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-securex-50 text-securex-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-neutral-700">
                  {action.label}
                </span>
              </div>
            );
            return action.to ? (
              <Link key={action.label} to={action.to}>
                {content}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.action}
                className="text-left"
              >
                {content}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">
            Recent Credentials
          </h2>
          <Link
            to="/holder/credentials"
            className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : recentCredentials.length === 0 ? (
          <EmptyState
            compact
            title="No credentials yet"
            description="You don't have any credentials in your wallet yet."
          />
        ) : (
          <div className="space-y-3">
            {recentCredentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                title={credential.title}
                credentialType={credential.type}
                issuer={credential.institutionName}
                issuerVerified
                status={credential.status}
                issuedAt={credential.issuedAt}
                expiresAt={credential.expiresAt}
                credentialId={credential.credentialId}
                onClick={() => navigate(`/holder/credentials/${credential.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {recentActivity.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              Recent Activity
            </h2>
          </div>
          <Card padding="none" className="divide-y divide-neutral-100">
            {recentActivity.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 px-4 py-3"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    event.result === 'VALID'
                      ? 'bg-trust-50 text-trust-600'
                      : event.result === 'REVOKED'
                        ? 'bg-danger-50 text-danger-600'
                        : 'bg-warning-50 text-warning-600'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-800">
                    {event.credentialTitle}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Verified by {event.verifiedBy} · {event.method.replace('_', ' ')}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">
                  {formatDate(event.verifiedAt)}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">
            Notifications
          </h2>
          <Link
            to="/holder/notifications"
            className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
          >
            {unreadCount > 0 ? `${unreadCount} unread · ` : ''}View all{' '}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card padding="none" className="divide-y divide-neutral-100">
          {recentNotifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              No notifications yet.
            </p>
          ) : (
            recentNotifications.map((notification) => (
              <Link
                key={notification.id}
                to="/holder/notifications"
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    notification.type === 'ERROR'
                      ? 'bg-danger-50 text-danger-600'
                      : notification.type === 'WARNING'
                        ? 'bg-warning-50 text-warning-600'
                        : 'bg-trust-50 text-trust-600'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {notification.title}
                  </p>
                  <p className="line-clamp-1 text-xs text-neutral-500">
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-securex-600" />
                )}
              </Link>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}
