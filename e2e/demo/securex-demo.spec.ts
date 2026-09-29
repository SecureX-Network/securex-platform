/**
 * SecureX demo recorder.
 *
 * Runs the SecureX product story end to end and records it. This is a
 * presentation automation, not a test suite: it is excluded from `npm run
 * test:e2e` by `testIgnore` in `playwright.config.ts` and driven by its own
 * `playwright.demo.config.ts`.
 *
 * What it asserts is deliberately narrow — the state transitions a viewer would
 * notice if they were wrong (login landed, credential loaded, QR rendered,
 * VALID, issue succeeded, revoke succeeded, REVOKED). Everything else is
 * pacing. It never asserts, fakes or narrates a result the application did not
 * actually produce.
 *
 * The one branch in the story is scene 07. Camera-based scanning is attempted
 * first because it is the real product path; if the decode does not arrive
 * within a bounded wait, the scene falls back to the application's supported
 * credential-ID route and puts "VERIFY CREDENTIAL" on screen to say so. Either
 * way the verification shown is performed by the application.
 */

import { test, type Page } from '@playwright/test';
import path from 'node:path';
import {
  ACCOUNTS,
  ARTIFACT_DIR,
  BROWSER_CONTEXT,
  DEMO_OVERLAY_KEY,
  DEMO_STORAGE_KEYS,
  FEATURED_CREDENTIAL,
  ISSUED_CREDENTIAL,
  TIMING,
} from './demo-config';
import { SCENES, type Scene } from './demo-scenes';
import { installOverlay, overlay } from './demo-overlay';
import {
  beat,
  captureFailure,
  cleanFrame,
  expectState,
  highlight,
  humanClick,
  humanType,
  pointAt,
  say,
  scrollTo,
  SceneFailure,
} from './demo-utils';

/** Bounded wait for the camera decode before falling back to the ID route. */
const QR_DECODE_TIMEOUT = 25_000;

let activeScene: Scene | null = null;

/** Log a scene boundary so the terminal mirrors what the viewer is watching. */
function sceneStep(scene: Scene, note?: string) {
  activeScene = scene;
  say(`${scene.id} — ${scene.name}${note ? ` · ${note}` : ''}`);
}

/**
 * Sign out and wipe the DEMO credential overlay.
 *
 * Phase 10 of the brief: every recording must start from the shipped dataset,
 * so a credential left REVOKED by a previous run cannot leak into this one.
 * The overlay key is the app's own, and clearing it is exactly what the app's
 * `resetDemoCredentialOverlay()` does.
 */
async function resetDemoState(page: Page) {
  await page.evaluate((keys) => {
    for (const key of keys) window.localStorage.removeItem(key);
  }, [...DEMO_STORAGE_KEYS]);
}

/**
 * Sign in through the real form, using the page's own demo-account selector.
 *
 * The "Use" button fills both fields, which is what keeps the password off
 * screen for the whole recording — the viewer sees the email appear and never
 * sees the credential itself.
 */
async function signIn(
  page: Page,
  scene: Scene,
  account: (typeof ACCOUNTS)[keyof typeof ACCOUNTS],
) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Use' }).nth(account.useButtonIndex).waitFor({
    timeout: 20_000,
  });

  await overlay.scene(page, scene);
  await beat(page, TIMING.transition);

  await humanClick(page, page.getByRole('button', { name: 'Use' }).nth(account.useButtonIndex), {
    settleAfter: 700,
  });

  // The fill is real application behaviour; assert it happened.
  const email = await page.getByLabel('Email').inputValue();
  if (email !== account.email) {
    throw new SceneFailure(
      scene.id,
      scene.name,
      `demo selector filled ${email || '(empty)'}, expected ${account.email}`,
    );
  }
  const password = await page.locator('#login-password').inputValue();
  if (password.length === 0) {
    throw new SceneFailure(scene.id, scene.name, 'demo selector left the password empty');
  }

  await humanClick(page, page.getByRole('button', { name: 'Sign in' }), {
    settleAfter: 400,
  });

  await page.waitForURL(/\/(home|credentials)/, { timeout: 25_000 });
  await beat(page, TIMING.dashboard);
}

/** Wait for the shell to be interactive after a navigation. */
async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
}

test.describe('SecureX product demo', () => {
  // One test for the whole story on purpose: the scenes share a single page,
  // a single session and a single video segment, so splitting them would
  // produce one video per scene and lose the continuity.
  test('records the full credential trust journey', async ({ page, context }) => {
    test.setTimeout(12 * 60_000);

    await installOverlay(context);
    await page.setViewportSize(BROWSER_CONTEXT.viewport);

    // Only needed when the orchestrator supplied a fake-camera clip. localhost
    // is a secure origin, so the permission can be granted without a prompt.
    if (process.env.SECUREX_DEMO_FAKE_CAMERA) {
      await context.grantPermissions(['camera'], {
        origin: new URL(process.env.SECUREX_DEMO_BASE_URL ?? '/').origin,
      });
    }

    try {
      // ────────────────────────────────────────────────────────────────
      // SCENE 01 — SECUREX LANDING
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.landing);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await resetDemoState(page);
      await page.reload({ waitUntil: 'domcontentloaded' });

      // Wait for the hero to actually paint before holding on it.
      await page.getByRole('heading', { name: /digital credentials/i }).waitFor({
        timeout: 20_000,
      });
      await beat(page, 1200);
      await overlay.scene(page, SCENES.landing);
      await beat(page, TIMING.landing);
      await overlay.scene(page, SCENES.landingTagline);
      await beat(page, TIMING.result);
      await cleanFrame(page);

      // ────────────────────────────────────────────────────────────────
      // SCENE 02 — HOLDER LOGIN
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.holderLogin, ACCOUNTS.holder.email);
      await signIn(page, SCENES.holderLogin, ACCOUNTS.holder);

      // ────────────────────────────────────────────────────────────────
      // SCENE 03 — HOLDER HOME
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.holderHome);
      await overlay.scene(page, SCENES.holderHome);
      await expectState(page, SCENES.holderHome, page.getByText(/welcome back/i), 'holder greeting');
      await beat(page, TIMING.dashboard);
      await pointAt(page, page.getByText(/total credentials/i), 600);
      await cleanFrame(page);

      // ────────────────────────────────────────────────────────────────
      // SCENE 04 — OPEN CREDENTIAL
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.credential, FEATURED_CREDENTIAL.title);
      await gotoApp(page, '/credentials');
      const card = page
        .locator('[role="button"], button, a')
        .filter({ hasText: FEATURED_CREDENTIAL.title })
        .first();
      await card.waitFor({ timeout: 20_000 });
      await humanClick(page, card);

      await page.waitForURL(/\/credentials\/.+/, { timeout: 20_000 });
      await expectState(
        page,
        SCENES.credential,
        page.getByText(FEATURED_CREDENTIAL.publicId),
        'public credential id on the detail page',
      );
      await beat(page, TIMING.transition);

      await overlay.scene(page, SCENES.credential);
      // Ring the status so the viewer's eye lands on validity, not the chrome.
      await highlight(page, page.getByText(FEATURED_CREDENTIAL.status).first(), 2600);
      await cleanFrame(page);

      // ────────────────────────────────────────────────────────────────
      // SCENE 05 — QR / SHARE
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.share);
      await gotoApp(page, '/share');
      const qr = page.locator('svg[role="img"]').first();
      await expectState(page, SCENES.share, qr, 'QR code on the share page');

      // The QR is the app's own qrcode.react output; confirm it is a real
      // symbol rather than the "Preparing QR…" placeholder.
      const modules = await qr.locator('path').count();
      if (modules < 2) {
        throw new SceneFailure(SCENES.share.id, SCENES.share.name, 'QR did not render modules');
      }

      await scrollTo(qr);
      await overlay.scene(page, SCENES.share);
      await pointAt(page, qr, 800);
      await beat(page, TIMING.qr);
      await cleanFrame(page);

      // ────────────────────────────────────────────────────────────────
      // SCENE 06 — EMPLOYER LOGIN
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.employerLogin, ACCOUNTS.employer.email);
      await signIn(page, SCENES.employerLogin, ACCOUNTS.employer);

      // ────────────────────────────────────────────────────────────────
      // SCENE 07 — EMPLOYER VERIFY
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.employerVerify, 'camera first, ID route as fallback');
      await gotoApp(page, '/verify-credential');
      const scannerButton = page.getByRole('button', { name: /scan with camera/i });
      await scannerButton.waitFor({ timeout: 20_000 });
      await beat(page, TIMING.transition);

      const verified = page.getByText(/credential verified/i).first();
      const notValid = page.getByText(/credential not valid/i).first();

      // Preferred path: the application's real camera scanner, fed the real QR.
      await overlay.scene(page, SCENES.employerVerify);
      let usedCamera = false;
      await humanClick(page, scannerButton, { settleAfter: 600 });

      try {
        await verified.or(notValid).first().waitFor({ timeout: QR_DECODE_TIMEOUT });
        usedCamera = true;
        say('   camera scan decoded the live SecureX QR');
      } catch {
        // Honest fallback: say what is happening, then use the ID route the
        // application supports. The verification itself is still real.
        say('   camera decode unavailable — using the credential ID route');
        await overlay.caption(page, 'VERIFY CREDENTIAL');
        await beat(page, 1600);

        const closeScanner = page.getByRole('button', { name: /close|stop|cancel/i });
        if (await closeScanner.count()) {
          await closeScanner.first().click().catch(() => undefined);
        }
        await gotoApp(page, '/verify-credential');
        await overlay.caption(page, 'VERIFY CREDENTIAL');
        await humanType(
          page,
          page.getByLabel(/credential id to verify/i),
          FEATURED_CREDENTIAL.publicId,
        );
        await humanClick(page, page.getByRole('button', { name: /verify credential/i }).last(), {
          settleAfter: 400,
        });
        await verified.or(notValid).first().waitFor({ timeout: 25_000 });
      }

      // Critical state transition: the credential must actually be VALID.
      await expectState(page, SCENES.employerVerify, verified, 'VALID verification result');
      await overlay.scene(page, SCENES.employerVerify);
      await scrollTo(verified, 600);
      await highlight(page, page.getByText(FEATURED_CREDENTIAL.status).first(), TIMING.valid);
      say(`   result: VALID (via ${usedCamera ? 'QR camera scan' : 'credential ID'})`);
      await cleanFrame(page);

      // ────────────────────────────────────────────────────────────────
      // SCENE 08 — INSTITUTION LOGIN
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.institutionLogin, ACCOUNTS.institution.email);
      await signIn(page, SCENES.institutionLogin, ACCOUNTS.institution);

      // ────────────────────────────────────────────────────────────────
      // SCENE 09 — ISSUE CREDENTIAL
      // ────────────────────────────────────────────────────────────────
      sceneStep(SCENES.issue, ISSUED_CREDENTIAL.title);
      await gotoApp(page, '/institution/issue');
      await page.getByLabel('Credential Type').waitFor({ timeout: 20_000 });
      await beat(page, TIMING.transition);

      await page.getByLabel('Credential Type').selectOption(ISSUED_CREDENTIAL.type);
      await beat(page, TIMING.navigate);
      await humanType(page, page.getByLabel('Title'), ISSUED_CREDENTIAL.title);
      await humanType(page, page.getByLabel('Description'), ISSUED_CREDENTIAL.description, {
        perChar: 8,
      });
      await humanType(page, page.getByLabel('Holder Name'), ISSUED_CREDENTIAL.holderName);
      await humanType(page, page.getByLabel('Holder Email'), ISSUED_CREDENTIAL.holderEmail);

      await overlay.scene(page, SCENES.issue);
      await beat(page, TIMING.beforeSubmit);

      const submit = page.getByRole('button', { name: /^issue credential$/i });
      await humanClick(page, submit, { settleAfter: 400 });

      // The success modal shows the PUBLIC id the platform minted.
      const successHeading = page.getByText(/successfully issued/i);
      await expectState(page, SCENES.issue, successHeading, 'issuance success state');
      await beat(page, 700);

      const issuedIdText = await page
        .locator('p.font-mono')
        .first()
        .innerText()
        .catch(() => '');
      const issuedId = issuedIdText.trim();
      if (!/^SX-/.test(issuedId)) {
        throw new SceneFailure(
          SCENES.issue.id,
          SCENES.issue.name,
          `issuance modal did not expose a public credential id (got "${issuedIdText}")`,
        );
      }
      say(`   issued ${issuedId}`);
      await overlay.scene(page, SCENES.issue);
      await highlight(page, successHeading, TIMING.result);
      await cleanFrame(page);

      // Close the modal and confirm the credential is really in the list.
      const done = page.getByRole('button', { name: /^done$/i });
      if (await done.count()) await humanClick(page, done.first());

      // ───────────────────────────────────────────────────────────────
      // SCENE 10 — REVOKE
      // ───────────────────────────────────────────────────────────────
      sceneStep(SCENES.revoke, issuedId);
      await gotoApp(page, '/institution/credentials');
      const searchBox = page.getByPlaceholder(/search/i).first();
      await searchBox.waitFor({ timeout: 20_000 });
      await humanType(page, searchBox, issuedId, { perChar: 40 });

      const row = page.locator('tr', { hasText: issuedId }).first();
      await row.waitFor({ timeout: 20_000 });
      await overlay.scene(page, SCENES.revoke);
      await pointAt(page, row, 700);

      // Select the row via its own checkbox, then the real revoke action.
      await humanClick(page, row.getByRole('checkbox').first(), { settleAfter: 500 });
      const revokeSelected = page.getByRole('button', { name: /revoke selected/i });
      await expectState(page, SCENES.revoke, revokeSelected, 'Revoke Selected action');
      await humanClick(page, revokeSelected, { settleAfter: 700 });

      // The app confirms with an alertdialog; accept it.
      const confirmRevoke = page.getByRole('button', { name: /^revoke$/i });
      await expectState(page, SCENES.revoke, confirmRevoke, 'revoke confirmation dialog');
      await beat(page, TIMING.beforeSubmit);
      await humanClick(page, confirmRevoke, { settleAfter: 500 });

      // The app surfaces a live region on success — wait for that, not a guess.
      const revokeBanner = page.getByRole('status');
      await expectState(page, SCENES.revoke, revokeBanner, 'revocation confirmation banner');
      await beat(page, 900);

      // And the row itself must now read REVOKED.
      const revokedCell = row.getByText(/revoked/i).first();
      await revokedCell.waitFor({ timeout: 20_000 });
      await overlay.scene(page, SCENES.revoke);
      await highlight(page, revokedCell, TIMING.revoked);
      say('   revoked: platform status is now REVOKED');
      await cleanFrame(page);

      // ─────────────────────────────────────────────────────────────
      // SCENE 11 — EMPLOYER RE-VERIFICATION
      // ─────────────────────────────────────────────────────────────
      sceneStep(SCENES.reverify, issuedId);
      await signIn(page, SCENES.reverify, ACCOUNTS.employer);
      await gotoApp(page, '/verify-credential');
      await page
        .getByLabel(/credential id to verify/i)
        .waitFor({ timeout: 20_000 });
      await beat(page, TIMING.transition);

      await overlay.scene(page, SCENES.reverify);
      await humanType(
        page,
        page.getByLabel(/credential id to verify/i),
        issuedId,
        { perChar: 34 },
      );
      await humanClick(page, page.getByRole('button', { name: /verify credential/i }).last(), {
        settleAfter: 400,
      });

      // The key final proof: the app must report the credential REVOKED.
      const revokedResult = page.getByText(/revoked/i).first();
      await revokedResult.waitFor({ timeout: 25_000 });
      await expectState(
        page,
        SCENES.reverify,
        page.getByText(/credential not valid/i),
        'revoked warning shown to the verifier',
      );
      await beat(page, 800);
      await scrollTo(revokedResult, 600);
      await overlay.scene(page, SCENES.reverify);
      await highlight(page, revokedResult, TIMING.revoked);
      say('   re-verification: REVOKED — the demo proof holds');
      await cleanFrame(page);

      // ─────────────────────────────────────────────────────────────
      // SCENE 12 — CLOSING
      // ─────────────────────────────────────────────────────────────
      sceneStep(SCENES.closing);
      // The public landing page redirects an authenticated user straight to
      // their dashboard, so sign out first — otherwise the closing frame is the
      // employer workspace rather than the product's own front door. The demo
      // credential overlay is deliberately left in place: the revoke and
      // re-verify in the preceding scenes are the substance of the claim, and
      // wiping them would make the closing frame nicer but dishonest.
      await page.evaluate((keys) => {
        for (const key of keys) window.localStorage.removeItem(key);
      }, [...DEMO_STORAGE_KEYS.filter((k) => k !== DEMO_OVERLAY_KEY)]);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /digital credentials/i }).waitFor({
        timeout: 20_000,
      });
      await beat(page, 1200);
      await overlay.scene(page, SCENES.closing);
      await overlay.closingFootnote(page);
      await overlay.hideCursor(page);
      await beat(page, TIMING.closing);

      activeScene = null;
      say('   all scenes complete');

      // Hand the recorded segment's location to the orchestrator, which does
      // the MP4/thumbnail conversion. Written rather than attached because the
      // path has to survive the run, not travel with the report.
      // `video().path()` resolves the path only once the page closes, so it must
      // be awaited here rather than inside the test's last statement.
      const video = page.video();
      if (video) {
        const videoPath = await video.path();
        const fs = await import('node:fs/promises');
        await fs.mkdir(ARTIFACT_DIR, { recursive: true });
        await fs.writeFile(path.join(ARTIFACT_DIR, '.video-path'), videoPath, 'utf8');
      }
    } catch (error) {
      // Preserve the partial recording and name the scene that broke. The
      // brief is explicit: never let a failure produce a clean-looking video.
      const { log } = await captureFailure(ARTIFACT_DIR, page, activeScene, error);
      throw new SceneFailure(
        activeScene?.id ?? '??',
        activeScene?.name ?? 'before first scene',
        `${error instanceof Error ? error.message : String(error)}\n  (details: ${log})`,
      );
    }
  });
});
