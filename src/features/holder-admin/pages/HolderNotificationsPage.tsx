import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Button, Card, EmptyState, Tabs } from '@/components/ui';
import type { TabItem } from '@/components/ui';
import { MOCK_NOTIFICATIONS } from '@/services/mock';
import type { Notification } from '@/types';
import { formatDate, classNames } from '@/utils';

type Filter = 'ALL' | 'credential' | 'security' | 'system';

const typeConfig: Record<
  Notification['type'],
  { icon: typeof Info; classes: string }
> = {
  SUCCESS: { icon: CheckCircle2, classes: 'bg-trust-50 text-trust-600' },
  INFO: { icon: Info, classes: 'bg-securex-50 text-securex-600' },
  WARNING: { icon: AlertTriangle, classes: 'bg-warning-50 text-warning-600' },
  ERROR: { icon: ShieldAlert, classes: 'bg-danger-50 text-danger-600' },
};

function categorize(notification: Notification): Exclude<Filter, 'ALL'> {
  const topic = `${notification.title} ${notification.message}`.toLowerCase();
  if (
    topic.includes('sign-in') ||
    topic.includes('security') ||
    topic.includes('device')
  ) {
    return 'security';
  }
  if (
    topic.includes('welcome') ||
    topic.includes('wallet') ||
    topic.includes('setting')
  ) {
    return 'system';
  }
  return 'credential';
}

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export default function HolderNotificationsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [notifications, setNotifications] = useState<Notification[]>(
    () => MOCK_NOTIFICATIONS,
  );

  const unread = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const counts = useMemo(() => {
    return {
      ALL: notifications.length,
      credential: notifications.filter((n) => categorize(n) === 'credential')
        .length,
      security: notifications.filter((n) => categorize(n) === 'security').length,
      system: notifications.filter((n) => categorize(n) === 'system').length,
    };
  }, [notifications]);

  const tabs: TabItem[] = [
    { id: 'ALL', label: `All (${counts.ALL})` },
    { id: 'credential', label: `Credential (${counts.credential})` },
    { id: 'security', label: `Security (${counts.security})` },
    { id: 'system', label: `System (${counts.system})` },
  ];

  const visible = notifications.filter(
    (n) => filter === 'ALL' || categorize(n) === filter,
  );

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {unread > 0 ? `${unread} unread` : 'You’re all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      <Tabs
        tabs={tabs}
        activeTab={filter}
        onChange={(id) => setFilter(id as Filter)}
        variant="pills"
        listClassName="overflow-x-auto pb-1"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={
            <div className="flex h-7 w-7 items-center justify-center">
              <BellOff className="h-6 w-6" />
            </div>
          }
          title="No notifications"
          description="There are no notifications in this category right now."
        />
      ) : (
        <Card padding="none" className="divide-y divide-neutral-100">
          {visible.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => markRead(notification.id)}
                className={classNames(
                  'flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-neutral-50',
                  !notification.read && 'bg-securex-50/40',
                )}
              >
                <span
                  className={classNames(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    config.classes,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={classNames(
                        'truncate text-sm',
                        notification.read
                          ? 'text-neutral-700'
                          : 'font-semibold text-neutral-900',
                      )}
                    >
                      {notification.title}
                    </p>
                    <span
                      className={classNames(
                        'shrink-0 text-xs',
                        notification.read ? 'text-neutral-400' : 'text-securex-600',
                      )}
                    >
                      {timeAgo(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-neutral-500">
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-securex-600" />
                )}
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}