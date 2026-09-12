import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { formatDate } from '@/utils';
import type { Notification } from '@/types';

function iconClassFor(type: Notification['type']): string {
  switch (type) {
    case 'SUCCESS':
      return 'bg-trust-50 text-trust-600';
    case 'WARNING':
      return 'bg-warning-50 text-warning-600';
    case 'ERROR':
      return 'bg-danger-50 text-danger-600';
    default:
      return 'bg-securex-50 text-securex-600';
  }
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOpenAll = () => {
    onClose();
    navigate('/notifications');
  };

  const handleOpenNotification = (notification: Notification) => {
    if (!notification.read) void markRead(notification.id);
    onClose();
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Notifications"
      className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-securex border border-neutral-200 bg-white shadow-securex-xl animate-securex-scale-in sm:w-96"
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <p className="text-sm font-semibold text-neutral-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-securex-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount} new
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="inline-flex items-center gap-1 text-xs font-medium text-securex-600 hover:text-securex-700 disabled:opacity-50"
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox className="h-8 w-8 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-700">All caught up</p>
            <p className="text-xs text-neutral-500">You have no notifications.</p>
          </div>
        ) : (
          items.slice(0, 8).map((notification) => (
            <button
              key={notification.id}
              type="button"
              role="menuitem"
              onClick={() => handleOpenNotification(notification)}
              className="flex w-full items-start gap-3 border-b border-neutral-50 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClassFor(
                  notification.type,
                )}`}
              >
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-neutral-800">
                  {notification.title}
                </span>
                <span className="line-clamp-2 block text-xs text-neutral-500">
                  {notification.message}
                </span>
                <span className="mt-1 block text-[11px] text-neutral-400">
                  {formatDate(notification.createdAt)}
                </span>
              </span>
              {!notification.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-securex-600" />
              )}
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={handleOpenAll}
        className="flex w-full items-center justify-center gap-1.5 border-t border-neutral-100 px-4 py-2.5 text-xs font-semibold text-securex-600 hover:bg-securex-50"
      >
        View all notifications
      </button>
    </div>
  );
}