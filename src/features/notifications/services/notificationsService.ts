import { MOCK_NOTIFICATIONS } from '@/services/mock';
import type { Notification } from '@/types';

/**
 * Notifications for authenticated users.
 *
 * The SecureX API currently exposes no notifications contract to the
 * frontend, so this service reads the bundled notification dataset. When a
 * real notifications endpoint lands, swap this implementation behind the
 * same interface without touching consumers.
 */
export async function fetchNotifications(): Promise<Notification[]> {
  return [...MOCK_NOTIFICATIONS];
}

export interface MarkNotificationInput {
  id: string;
  read: boolean;
}

export async function setNotificationReadState(
  items: Notification[],
  input: MarkNotificationInput,
): Promise<Notification[]> {
  return items.map((n) => (n.id === input.id ? { ...n, read: input.read } : n));
}