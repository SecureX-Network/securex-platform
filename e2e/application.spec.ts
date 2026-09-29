import { test, expect, type Page } from '@playwright/test';

const USER_KEY = 'securex_auth_user';
const TOKEN_KEY = 'securex_auth_token';

function stubUser(role: string) {
  return {
    id: 'usr-e2e-001',
    email: `e2e-${role.toLowerCase()}@securex.in`,
    name: 'E2E User',
    role,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

async function seedSession(page: Page, role: string) {
  await page.goto('/');
  await page.evaluate(
    ({ key, tokenKey, user }) => {
      window.localStorage.setItem(key, JSON.stringify(user));
      window.localStorage.setItem(tokenKey, 'e2e-token');
    },
    { key: USER_KEY, tokenKey: TOKEN_KEY, user: stubUser(role) },
  );
  await page.reload();
}

test.describe('App gateway (root)', () => {
  test('renders the application entry, not marketing content', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /digital credentials\. built for trust\./i }),
    ).toBeVisible();
    await expect(page.getByText('WebApp', { exact: true })).toBeVisible();
    await expect(page.getByText('Role-based workspaces', { exact: true })).toBeVisible();
    await expect(page.getByText(/10,000\+/i)).toHaveCount(0);
  });

  test('Sign In flows to /auth/login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByText(/sign in to access your securex workspace\./i)).toBeVisible();
  });

  test('Create Account flows to /auth/register', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /create account/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('Verify a Credential flows to /verify', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /verify a credential/i }).first().click();
    await expect(page).toHaveURL(/\/verify$/);
    await expect(page.getByRole('heading', { name: /verify any credential instantly/i })).toBeVisible();
  });

  test('Explore the Network flows to /explorer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /explore the network/i }).first().click();
    await expect(page).toHaveURL(/\/explorer$/);
    await expect(page.getByRole('heading', { name: /securex blockchain explorer/i })).toBeVisible();
  });

  test('footer links to the public website externally', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: /public website/i })).toHaveAttribute(
      'href',
      'https://securex.sp-net.in',
    );
  });
});

test.describe('Marketing routes redirect to the public website', () => {
  for (const path of ['/about', '/how-it-works', '/contact']) {
    test(`/about-style path ${path} leaves the app`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/securex\.sp-net\.in/, { timeout: 15_000 });
    });
  }
});

test.describe('Authenticated root redirects by role', () => {
  const cases: Array<{ role: string; expected: string }> = [
    { role: 'HOLDER', expected: '/home' },
    { role: 'INSTITUTION', expected: '/home' },
    { role: 'ISSUER', expected: '/home' },
    { role: 'EMPLOYER', expected: '/home' },
    { role: 'ADMIN', expected: '/home' },
    { role: 'SECURITY_ADMIN', expected: '/home' },
    { role: 'NETWORK_ADMIN', expected: '/home' },
    { role: 'AUDITOR', expected: '/home' },
  ];

  for (const { role, expected } of cases) {
    test(`${role} is routed to ${expected}`, async ({ page }) => {
      await seedSession(page, role);
      await expect(page).toHaveURL(new RegExp(`${expected}$`));
    });
  }

  test('legacy dashboard URLs redirect to the Home page', async ({ page }) => {
    const cases: Array<{ path: string; role: string }> = [
      { path: '/holder/dashboard', role: 'HOLDER' },
      { path: '/admin/dashboard', role: 'ADMIN' },
      { path: '/institution/dashboard', role: 'INSTITUTION' },
      { path: '/employer/dashboard', role: 'EMPLOYER' },
    ];
    for (const { path, role } of cases) {
      await seedSession(page, role);
      await page.goto(path);
      await expect(page).toHaveURL(/\/home$/);
    }
  });

  test('session survives a reload while on the app gateway', async ({ page }) => {
    await seedSession(page, 'HOLDER');
    await expect(page).toHaveURL(/\/home/);
    await page.reload();
    await expect(page).toHaveURL(/\/home/);
  });
});

test.describe('Unreachable private routes render a meaningful page', () => {
  test('unknown path shows NotFound', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: /not found|404/i }).first()).toBeVisible();
  });
});

test.describe('Console and network hygiene', () => {
  test('root and public pages emit no page errors and no failed requests', async ({ page }) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()}`));

    for (const path of ['/', '/verify', '/explorer']) {
      await page.goto(path);
      await expect(page.locator('body').first()).toBeAttached();
    }

    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});

test.describe('Responsive layout (no horizontal overflow)', () => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 480, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    test(`no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(
        page.getByRole('heading', { level: 1, name: /digital credentials\. built for trust\./i }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('Authenticated shell (HOLDER)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'HOLDER');
  });

  test('sidebar shows role-relevant grouped navigation', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    // The ledger group is present but deliberately last and reduced to a single
    // entry: infrastructure stays reachable without competing with credentials
    // and verification for a first-time holder's attention.
    for (const label of ['Home', 'Credentials', 'Verify', 'Activity', 'Settings', 'Ledger']) {
      await expect(page.getByRole('navigation', { name: label })).toBeVisible();
    }
    const sidebar = page.getByRole('complementary', { name: 'Application navigation' });
    for (const label of ['Home', 'My Credentials', 'Wallet', 'Verify', 'Verification History', 'Activity', 'Notifications', 'Settings', 'Block Explorer']) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    // Deep infrastructure pages are routable but not given sidebar prominence.
    for (const label of ['Blocks', 'Validators', 'Network Peers']) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    }
  });

  test('sidebar hides institution, admin, and security items from a HOLDER', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    const sidebar = page.getByRole('complementary', { name: 'Application navigation' });
    for (const label of ['Issue Credential', 'Templates', 'Security Center', 'Fraud & Tampering', 'Users', 'Institutions']) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    }
  });

  test('home renders a holder workspace with quick actions and recent credentials', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
    await expect(main.getByText(/welcome back/i)).toBeVisible();
    await expect(main.getByRole('link', { name: /my credentials/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /notifications/i })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Recent Activity' })).toBeVisible();
  });

  test('breadcrumb reflects the section and page label', async ({ page }) => {
    await page.goto('/holder/wallet');
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toContainText('SecureX');
    await expect(breadcrumb).toContainText('Credentials');
    await expect(breadcrumb).toContainText('Wallet');
  });

  test('mobile drawer opens and closes via the menu button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/holder/wallet');
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeInViewport();
    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(page.getByRole('button', { name: 'Close menu' })).not.toBeInViewport();
  });

  test('wallet page renders its heading inside the shell', async ({ page }) => {
    await page.goto('/holder/wallet');
    await expect(page.getByRole('heading', { level: 1, name: 'Wallet' })).toBeVisible();
  });

  test('activity center renders inside the shell', async ({ page }) => {
    await page.goto('/activity');
    await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
    await expect(page.getByText(/credentials, verifications, and security events/i)).toBeVisible();
  });
});

test.describe('Authenticated shell (institution)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'INSTITUTION');
  });

  test('home renders an institution portal with issue-first quick actions', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    const main = page.locator('main');
    await expect(main.getByText('Institution Portal')).toBeVisible();
    await expect(main.getByRole('link', { name: /issue credential/i }).first()).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Credential ecosystem' })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Recent Credentials Issued' })).toBeVisible();
  });

  test('skips operator-only surface', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    const sidebar = page.getByRole('complementary', { name: 'Application navigation' });
    for (const label of ['Users', 'Security Center', 'Audit Log']) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    }
  });
});

test.describe('Authenticated shell (employer)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'EMPLOYER');
  });

  test('home renders a verification-first employer workspace', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
    await expect(main.getByText(/check a candidate's credential or review past verifications/i)).toBeVisible();
    await expect(main.getByRole('link', { name: /verify a credential/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /verification history/i })).toBeVisible();
  });

  test('skips credential issuance surface', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Application navigation' });
    for (const label of ['Issue Credential', 'Templates', 'Users']) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    }
  });
});

test.describe('Authenticated shell (operator)', () => {
  test('ADMIN home shows platform stats, security posture and quick actions', async ({ page }) => {
    await seedSession(page, 'ADMIN');
    await expect(page).toHaveURL(/\/home/);
    const main = page.locator('main');
    await expect(main.getByText(/all systems operational/i)).toBeVisible();
    await expect(main.getByRole('link', { name: /security center/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /audit log/i })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Active Security Alerts' })).toBeVisible();
  });

  test('AUDITOR home hides the user administration quick action', async ({ page }) => {
    await seedSession(page, 'AUDITOR');
    await expect(page).toHaveURL(/\/home/);
    const main = page.locator('main');
    await expect(main.getByRole('link', { name: /audit log/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /users/i })).toHaveCount(0);
  });
});

test.describe('Command palette', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'HOLDER');
  });

  test('opens, searches, and navigates to a credential', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    await page.getByRole('button', { name: /search securex/i }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Search SecureX' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('searchbox', { name: 'Search SecureX' }).fill('Computer Science');
    await expect(page.getByText('Credentials', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: /computer science/i }).first().click();
    await expect(page).toHaveURL(/\/verify\/SX-/);
    await expect(page.getByRole('heading', { name: /credential/i })).toBeVisible();
  });

  test('closes with Escape', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    await page.getByRole('button', { name: /search securex/i }).first().click();
    await expect(page.getByRole('dialog', { name: 'Search SecureX' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Search SecureX' })).toHaveCount(0);
  });
});

test.describe('Notification center', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'HOLDER');
  });

  test('opens, marks all notifications read, and links to the notifications page', async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    const bell = page.getByRole('button', { name: /notifications \(\d+ unread\)/i });
    await expect(bell).toBeVisible();
    await bell.click();
    const panel = page.getByRole('menu', { name: 'Notifications' });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('View all notifications')).toBeVisible();
    await panel.getByRole('button', { name: 'Mark all read' }).click();
    await expect(page.getByRole('button', { name: /notifications \(0 unread\)/i })).toBeVisible();
    await panel.getByText('View all notifications').click();
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
  });
});

test.describe('New shell pages render', () => {
  test('account settings page renders', async ({ page }) => {
    await seedSession(page, 'HOLDER');
    await page.goto('/account/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Account & Settings' })).toBeVisible();
  });

  test('notifications page renders inside the shell', async ({ page }) => {
    await seedSession(page, 'HOLDER');
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
  });

  test('a page restricted to another role lands on /unauthorized', async ({ page }) => {
    await seedSession(page, 'EMPLOYER');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /401 · Unauthorized/i })).toBeVisible();
  });
});

test.describe('Authenticated pages: console and network hygiene', () => {
  test('HOLDER pipeline emits no page errors and no failed requests', async ({ page }) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()}`));

    await seedSession(page, 'HOLDER');
    for (const path of ['/home', '/activity', '/holder/wallet', '/verify', '/explorer', '/notifications', '/account/settings']) {
      await page.goto(path);
      await expect(page.locator('body').first()).toBeAttached();
    }

    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test('ADMIN pipeline emits no page errors and no failed requests', async ({ page }) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()}`));

    await seedSession(page, 'ADMIN');
    for (const path of ['/home', '/admin/users', '/security', '/fraud', '/admin/security/audit', '/activity']) {
      await page.goto(path);
      await expect(page.locator('body').first()).toBeAttached();
    }

    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});

test.describe('Responsive layout on authenticated pages', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 480, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    test(`no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedSession(page, 'HOLDER');
      for (const path of ['/home', '/activity', '/holder/wallet', '/notifications', '/account/settings']) {
        await page.goto(path);
        await expect(page.locator('body').first()).toBeAttached();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      }
    });
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`institution home has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedSession(page, 'INSTITUTION');
      await expect(page).toHaveURL(/\/home/);
      await expect(page.getByText('Institution Portal')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});