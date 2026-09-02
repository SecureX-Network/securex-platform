import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Camera,
  CreditCard,
  IdCard,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Card, CredentialCard, EmptyState, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getHolderCredentials } from '@/services/api/credentialService';
import { MOCK_NOTIFICATIONS } from '@/services/mock';
import type { Credential } from '@/types';

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
  const unreadCount = useMemo(
    () => MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
    [],
  );
  const recentCredentials = useMemo(() => credentials.slice(0, 3), [credentials]);
  const validCount = useMemo(
    () => credentials.filter((c) => c.status === 'VALID').length,
    [credentials],
  );

  const quickActions = [
    {
      label: 'All Credentials',
      icon: CreditCard,
      to: '/holder/credentials',
    },
    {
      label: 'Share',
      icon: Share2,
      to: '/holder/share',
    },
    {
      label: 'Scan',
      icon: Camera,
      action: () => navigate('/verify'),
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-securex-600 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-neutral-500">
              Here’s what’s happening in your wallet today.
            </p>
          </div>
        </div>
      </section>

      <Card className="bg-gradient-to-br from-securex-600 to-securex-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-securex-100">
              My Credentials
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-9 w-16 bg-white/20" />
            ) : (
              <p className="mt-1 text-4xl font-bold">{credentials.length}</p>
            )}
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <IdCard className="h-7 w-7" />
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">
            {validCount} valid
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1">
            {unreadCount} unread notifications
          </span>
        </div>
      </Card>

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
            description="You don’t have any credentials in your wallet yet."
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

      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
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
            Notifications
          </h2>
          <Link
            to="/holder/notifications"
            className="inline-flex items-center gap-1 text-sm font-medium text-securex-600 hover:text-securex-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card padding="none" className="divide-y divide-neutral-100">
          {MOCK_NOTIFICATIONS.slice(0, 3).map((notification) => (
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
          ))}
        </Card>
      </section>
    </div>
  );
}
