import { CheckCheck, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, EmptyState, Skeleton } from '@/components/ui';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { formatDate } from '@/utils';
import type { Notification } from '@/types';

const TYPE_STYLES: Record<Notification['type'], string> = {
  SUCCESS: 'bg-trust-50 text-trust-600 border-trust-100',
  WARNING: 'bg-warning-50 text-warning-600 border-warning-100',
  ERROR: 'bg-danger-50 text-danger-600 border-danger-100',
  INFO: 'bg-securex-50 text-securex-600 border-securex-100',
};

function NotificationRow({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const inner = (
    <div className={`flex items-start gap-3 px-4 py-4 ${!notification.read ? 'bg-securex-50/30' : ''}`}>
      <span
        className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full border ${
          !notification.read ? 'bg-securex-600 border-securex-600' : 'bg-transparent border-neutral-300'
        }`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-900">{notification.title}</p>
        <p className="mt-0.5 text-sm leading-6 text-neutral-600">{notification.message}</p>
        <p className="mt-1 text-xs text-neutral-400">{formatDate(notification.createdAt)}</p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_STYLES[notification.type]}`}
      >
        {notification.type}
      </span>
    </div>
  );

  return notification.actionUrl ? (
    <Link
      to={notification.actionUrl}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
      className="block transition-colors hover:bg-neutral-50"
    >
      {inner}
    </Link>
  ) : (
    <div className="block">{inner}</div>
  );
}

export default function NotificationsPage() {
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`Important updates about your credentials, verification requests, and security events.`}
        context="System"
      >
        {!loading && unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </PageHeader>

      <Card padding="none" className="divide-y divide-neutral-100">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="All caught up"
            description="You have no notifications right now."
          />
        ) : (
          items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onRead={markRead} />
          ))
        )}
      </Card>
    </div>
  );
}

export { NotificationCenter };