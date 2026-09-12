import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchNotifications,
  setNotificationReadState,
} from '@/features/notifications/services/notificationsService';
import type { Notification } from '@/types';

export interface NotificationsContextValue {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      const current = items;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      const next = await setNotificationReadState(current, { id, read: true });
      setItems(next);
    },
    [items],
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value = useMemo(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      loading,
      markRead,
      markAllRead,
      refresh,
    }),
    [items, loading, markRead, markAllRead, refresh],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}