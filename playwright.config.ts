import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // The demo recorder under e2e/demo/ is a presentation automation with its own
  // config (playwright.demo.config.ts), not part of the functional suite. It is
  // run explicitly with `npm run demo:record` and must never be collected here,
  // or `npm run test:e2e` would start recording a 5-minute video.
  testIgnore: '**/demo/**',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // The suite is a frontend shell/UX suite: it seeds a stub session in
  // localStorage and asserts on rendered UI, so it must NOT require a running
  // Platform API. DEMO mode keeps it hermetic — otherwise the data-fetching
  // pages call http://localhost:4000/api and the "no failed requests"
  // hygiene tests fail on a bare checkout. This mirrors the vitest suite,
  // which opts into DEMO for the same reason. REAL mode is covered by the
  // server integration suite and the vitest tests that stub back to 'false'.
  // Note: reuseExistingServer means a REAL-mode dev server already on :3000
  // will be reused, and the two hygiene tests will fail. Stop it, or start it
  // with VITE_USE_MOCK=true.
  webServer: {
    command: 'VITE_USE_MOCK=true npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});