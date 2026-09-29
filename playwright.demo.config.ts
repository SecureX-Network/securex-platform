import { defineConfig } from '@playwright/test';
import { VIEWPORT } from './e2e/demo/demo-config';

/**
 * Playwright configuration for the SecureX demo recorder.
 *
 * Deliberately separate from `playwright.config.ts` so the recorder can turn
 * video on, use a single worker and a long timeout, and write outside the
 * normal `test-results/` directory — none of which belongs in the functional
 * E2E suite. `npm run test:e2e` is unaffected by anything in this file.
 */

/**
 * When the orchestrator has built a Y4M clip of the app's real QR, Chromium is
 * launched with it as a fake webcam so scene 07 can use the product's actual
 * camera scanner. Absent, the story falls back to the credential-ID route.
 */
const fakeCamera = process.env.SECUREX_DEMO_FAKE_CAMERA;

export default defineConfig({
  testDir: './e2e/demo',
  testMatch: '**/*.spec.ts',

  // The whole story is one test, so the timeout covers the full recording.
  timeout: 12 * 60_000,
  expect: { timeout: 15_000 },

  // One worker: the story drives a single browser and a single video segment.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,

  // The recording is the deliverable; a list reporter keeps the console clean
  // enough to read the scene log the spec prints.
  reporter: [['list']],

  outputDir: 'artifacts/securex-demo/.playwright',

  use: {
    baseURL: process.env.SECUREX_DEMO_BASE_URL ?? 'http://localhost:3000',
    viewport: VIEWPORT,
    // Record every action. 'on' rather than 'retain-on-failure' so a failure
    // still produces the partial video the brief asks to preserve.
    video: {
      mode: 'on',
      size: VIEWPORT,
    },
    trace: 'off',
    screenshot: 'off',
    // Deterministic environment, and never the developer's own Chrome profile.
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    acceptDownloads: false,
    launchOptions: fakeCamera
      ? {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            `--use-file-for-fake-video-capture=${fakeCamera}`,
          ],
        }
      : {},
  },

  projects: [
    {
      name: 'securex-demo',
      use: { browserName: 'chromium' },
    },
  ],

  // Same hermetic DEMO mode the E2E suite uses: the data-fetching pages must
  // not call a Platform API that the recorder does not need.
  webServer: {
    command: 'VITE_USE_MOCK=true npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
