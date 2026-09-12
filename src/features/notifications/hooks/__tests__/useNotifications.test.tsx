import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { fetchNotifications, setNotificationReadState } from '@/features/notifications/services/notificationsService';
import { NotificationsProvider } from '@/features/notifications/providers/NotificationsProvider';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';

function Harness() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  return (
    <div>
      <div data-testid="unread">{unreadCount}</div>
      <div data-testid="count">{items.length}</div>
      <button type="button" onClick={() => void markRead(items[0]?.id ?? '')}>
        mark-first
      </button>
      <button type="button" onClick={() => void markAllRead()}>
        mark-all
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <NotificationsProvider>
      <Harness />
    </NotificationsProvider>,
  );
}

describe('useNotifications', () => {
  it('hydrates notifications and reports an unread count', async () => {
    renderHarness();
    await waitFor(() => {
      expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThan(0);
    });
    const all = await fetchNotifications();
    const unread = all.filter((n) => !n.read).length;
    expect(Number(screen.getByTestId('unread').textContent)).toBe(Number(unread));
  });

  it('marks an individual notification as read', async () => {
    renderHarness();
    await waitFor(() => {
      expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThan(0);
    });
    act(() => {
      screen.getByText('mark-first').click();
    });
    await waitFor(() => {
      expect(Number(screen.getByTestId('unread').textContent)).toBeLessThanOrEqual(
        Number(screen.getByTestId('count').textContent),
      );
    });
  });
});

describe('notificationsService', () => {
  it('updates read state immutably', async () => {
    const all = await fetchNotifications();
    const target = all[0]!;
    const next = await setNotificationReadState(all, { id: target.id, read: true });
    expect(target.read).toBe(false);
    expect(next.find((n) => n.id === target.id)?.read).toBe(true);
    expect(next.length).toBe(all.length);
  });
});