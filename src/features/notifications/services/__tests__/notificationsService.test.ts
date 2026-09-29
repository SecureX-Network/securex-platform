import { describe, it, expect } from 'vitest';
import { MOCK_NOTIFICATIONS } from '@/services/mock';
import { fetchNotifications } from '../notificationsService';

/**
 * The notification list is global — `fetchNotifications` does not filter by the
 * signed-in user — so every `actionUrl` it hands out has to be reachable by
 * every role. It used to point at `/credentials/cred-001` and `/share`, which
 * are HOLDER-only routes, so clicking a notification as an employer or an
 * institution bounced the presenter straight to /unauthorized mid-demo.
 */
const ROLE_RESTRICTED_PREFIXES = ['/credentials', '/share'];

/** `/holder/credentials/x` is a `<Navigate>` alias onto `/credentials/x`. */
function withoutHolderAlias(url: string): string {
  return url.startsWith('/holder/') ? url.slice('/holder'.length) : url;
}

describe('notification action links', () => {
  it('never links a role-restricted route', async () => {
    const items = await fetchNotifications();

    for (const item of items) {
      if (!item.actionUrl) continue;
      const target = withoutHolderAlias(item.actionUrl);
      expect(
        ROLE_RESTRICTED_PREFIXES.some((prefix) => target.startsWith(prefix)),
        `${item.id} links to role-restricted ${item.actionUrl}`,
      ).toBe(false);
    }
  });

  it('never leaks an internal credential id into a link', async () => {
    const items = await fetchNotifications();

    for (const item of items) {
      if (!item.actionUrl) continue;
      expect(item.actionUrl, `${item.id} leaks an internal credential id`).not.toMatch(
        /cred-\d+/,
      );
    }
  });

  it('links credential notifications to the public verifier', () => {
    const verified = MOCK_NOTIFICATIONS.find((n) => n.id === 'ntf-001');

    expect(verified?.actionUrl).toBe('/verify/SX-2F9C-A41B-8D7E');
  });
});
