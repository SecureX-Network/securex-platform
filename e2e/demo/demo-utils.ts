/**
 * SecureX demo recorder — interaction helpers.
 *
 * Two jobs:
 *  1. Make automation legible. A recorded `page.click()` is an instantaneous
 *     jump; a viewer cannot tell what was pressed or where. `humanClick` walks
 *     the real mouse to the element in interpolated steps, pauses on it, and
 *     fires a synthetic cursor pulse in the overlay.
 *  2. Make failures diagnosable. `SceneFailure` carries the scene id and name
 *     so the orchestrator can name the exact scene that broke, and
 *     `captureFailure` writes the screenshot and log the brief requires.
 */

import type { Locator, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { TIMING, VIEWPORT } from './demo-config';
import type { Scene } from './demo-scenes';
import { overlay } from './demo-overlay';

export class SceneFailure extends Error {
  constructor(
    readonly sceneId: string,
    readonly sceneName: string,
    message: string,
  ) {
    super(message);
    this.name = 'SceneFailure';
  }
}

/** Pause. Every hold in the recording goes through here so pacing is tunable. */
export function beat(page: Page, ms: number): Promise<void> {
  return page.waitForTimeout(ms);
}

/** Hold on a scene's caption without touching the step chip. */
export async function holdWithCaption(page: Page, text: string, ms: number) {
  await overlay.caption(page, text);
  await beat(page, ms);
}

/** Hide captions and step chip for an uncluttered transition frame. */
export async function cleanFrame(page: Page) {
  await overlay.clearScene(page);
  await overlay.focus(page, null);
}

/**
 * Walk the real mouse to an element, pause on it, then click.
 *
 * `page.mouse.move` with `steps` produces genuine interpolated motion, which is
 * what shows up on camera; a bare `locator.click()` would teleport.
 */
export async function humanClick(
  page: Page,
  target: Locator,
  opts: { settleBefore?: number; settleAfter?: number } = {},
): Promise<void> {
  // Scroll first, then measure. `boundingBox` is viewport-relative, so a target
  // below the fold (the issue form's submit button sits at y≈946 in a 900px
  // viewport) would otherwise be clicked at a coordinate that is off-screen,
  // where the mouse press lands on nothing at all.
  await target.scrollIntoViewIfNeeded();
  await beat(page, 220);
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('humanClick: target has no bounding box (hidden or zero-size)');
  }
  if (box.y < 0 || box.y + box.height > VIEWPORT.height) {
    throw new Error(
      `humanClick: target is still outside the viewport (y=${Math.round(box.y)})`,
    );
  }
  // Aim slightly inside the element so the ring never sits on its edge.
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y, { steps: TIMING.cursorSteps });
  await overlay.cursor(page, x, y);
  await beat(page, opts.settleBefore ?? 260);
  await page.mouse.down();
  await overlay.click(page);
  await beat(page, 90);
  await page.mouse.up();
  await beat(page, opts.settleAfter ?? 320);
}

/**
 * Type into a field the way a person would: click, short pause, then type.
 * Deliberately NOT `fill()`, which sets the value in one step and looks like a
 * paste in the recording.
 */
export async function humanType(
  page: Page,
  target: Locator,
  value: string,
  opts: { clear?: boolean; perChar?: number } = {},
): Promise<void> {
  await humanClick(page, target, { settleAfter: 120 });
  if (opts.clear !== false) {
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+A' : 'Control+A',
    );
    await page.keyboard.press('Backspace');
  }
  await page.keyboard.type(value, { delay: opts.perChar ?? 26 });
  await beat(page, 200);
}

/** Move the mouse to an element without clicking — used to point at a result. */
export async function pointAt(page: Page, target: Locator, settle = 500): Promise<void> {
  const box = await target.boundingBox();
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: TIMING.cursorSteps });
  await overlay.cursor(page, x, y);
  await beat(page, settle);
}

/**
 * Ring the overlay focus box around an element's viewport rect.
 * Used to make a status badge or a verification result impossible to miss.
 */
export async function highlight(
  page: Page,
  target: Locator | null,
  settle = 500,
): Promise<void> {
  if (!target) {
    await overlay.focus(page, null);
    return;
  }
  const box = await target.boundingBox();
  if (!box) {
    await overlay.focus(page, null);
    return;
  }
  // boundingBox() is relative to the main frame's viewport, which is exactly
  // the coordinate space the overlay's fixed layer uses.
  await overlay.focus(page, { x: box.x, y: box.y, width: box.width, height: box.height });
  await beat(page, settle);
}

/** Viewport rect of a locator, for the overlay's focus ring. */
export async function rectOf(target: Locator) {
  const box = await target.boundingBox();
  return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
}

/**
 * Wait for an app state and fail with the scene's identity if it never arrives.
 * Every critical assertion in the story goes through here.
 */
export async function expectState(
  page: Page,
  scene: Scene,
  locator: Locator,
  what: string,
  timeout = 15_000,
): Promise<void> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
  } catch {
    throw new SceneFailure(
      scene.id,
      scene.name,
      `${what} never appeared (waited ${timeout}ms)`,
    );
  }
}

/**
 * Scroll an element into view, then let it settle.
 * The story scrolls to the credential status and the QR, so this has to be a
 * gradual, visible movement rather than an instant jump.
 */
export async function scrollTo(target: Locator, ms = 700): Promise<void> {
  await target.evaluate((el) =>
    el.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  );
  await new Promise((r) => setTimeout(r, ms));
}

/** Write the failure artifacts the brief requires. Never throws. */
export async function captureFailure(
  dir: string,
  page: Page | null,
  scene: Scene | null,
  error: unknown,
): Promise<{ screenshot: string | null; log: string }> {
  await fs.mkdir(dir, { recursive: true });

  let screenshot: string | null = null;
  if (page) {
    try {
      const file = path.join(dir, 'failure.png');
      await page.screenshot({ path: file });
      screenshot = file;
    } catch {
      // A page that crashed mid-scene may refuse to screenshot; the log below
      // is the durable record.
    }
  }

  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const log = [
    'SecureX Demo Recorder FAILED',
    `Scene: ${scene ? `${scene.id} — ${scene.name}` : '(before first scene)'}`,
    '',
    message,
    '',
  ].join('\n');

  const logFile = path.join(dir, 'failure.log');
  await fs.writeFile(logFile, log, 'utf8');
  return { screenshot, log: logFile };
}

/** Console banner so the terminal shows progress even when nobody is watching. */
export function say(line: string): void {
  process.stdout.write(`  ${line}\n`);
}

export function banner(text: string): void {
  process.stdout.write(`\n\x1b[36m${text}\x1b[0m\n`);
}
