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
    { role: 'HOLDER', expected: '/holder/credentials' },
    { role: 'INSTITUTION', expected: '/institution/dashboard' },
    { role: 'ISSUER', expected: '/institution/dashboard' },
    { role: 'EMPLOYER', expected: '/employer/dashboard' },
    { role: 'ADMIN', expected: '/admin/dashboard' },
  ];

  for (const { role, expected } of cases) {
    test(`${role} is routed to ${expected}`, async ({ page }) => {
      await seedSession(page, role);
      await expect(page).toHaveURL(new RegExp(`${expected}$`));
    });
  }

  test('session survives a reload while on the app gateway', async ({ page }) => {
    await seedSession(page, 'HOLDER');
    await expect(page).toHaveURL(/\/holder\/credentials/);
    await page.reload();
    await expect(page).toHaveURL(/\/holder\/credentials/);
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