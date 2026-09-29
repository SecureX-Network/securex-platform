/**
 * SecureX demo recorder — in-video overlay.
 *
 * The recording is the product shot: the viewer is not watching a terminal, so
 * the step number, the heading and the caption all have to live inside the
 * viewport. This module mounts a single `position: fixed`, `pointer-events:
 * none` layer above the app and mutates its text as the story advances.
 *
 * Design constraints that shaped this:
 *  - It never intercepts a click. `pointer-events: none` on the root, so every
 *    element locator in the spec still hits the app underneath.
 *  - It lives in the corners. The app's own content is centre-weighted, so the
 *    overlay cannot cover a control the viewer needs to see.
 *  - It uses the SecureX dark palette rather than inventing a new one.
 *  - It is installed via `addInitScript`, so it survives every full navigation
 *    without the spec having to re-inject it.
 */

import type { Page } from '@playwright/test';
import { CLOSING_FOOTNOTE, type Scene } from './demo-scenes';

const OVERLAY_ID = 'securex-demo-overlay';

/** SecureX dark palette, matching the app's own tokens. */
const PALETTE = {
  bg: '#050505',
  surface: '#0E0E11',
  blue: '#3B82F6',
  violet: '#6D5EF5',
} as const;

/**
 * Everything `mountOverlay` needs from module scope.
 *
 * An init script is serialized by value, so it cannot close over these
 * constants — they are passed as an argument instead. Without this the
 * template literal in the page would throw on an undefined `PALETTE` and the
 * overlay would silently never mount.
 */
type OverlayConfig = {
  overlayId: string;
  palette: typeof PALETTE;
};

/**
 * Installed into every document in the recording context. Defines
 * `window.__securexDemo` with the imperative API the spec drives.
 */
function mountOverlay(config: OverlayConfig): void {
  const w = window as unknown as Record<string, unknown>;
  if (w.__securexDemo) return;
  const { overlayId: OVERLAY_ID, palette: PALETTE } = config;

  const style = document.createElement('style');
  style.id = 'securex-demo-style';
  style.textContent = `
    @keyframes sx-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes sx-pulse { 0% { transform: scale(1); opacity: .95; } 50% { transform: scale(1.5); opacity: .35; } 100% { transform: scale(1); opacity: .95; } }
    @keyframes sx-blink { 0%, 45% { opacity: 1; } 55%, 100% { opacity: .25; } }
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
      font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif; }
    #${OVERLAY_ID} * { box-sizing: border-box; }
    .sx-brand { position: absolute; top: 18px; left: 20px; display: flex; align-items: center; gap: 10px;
      padding: 8px 14px 8px 10px; border-radius: 10px; background: rgba(14,14,17,.82);
      border: 1px solid rgba(59,130,246,.28); backdrop-filter: blur(6px); }
    .sx-brand-mark { width: 20px; height: 20px; border-radius: 5px;
      background: linear-gradient(135deg, ${PALETTE.blue}, ${PALETTE.violet}); }
    .sx-brand-name { color: #fff; font-size: 13px; font-weight: 700; letter-spacing: .16em; }
    .sx-step { position: absolute; left: 20px; bottom: 20px; display: flex; align-items: center; gap: 10px;
      padding: 9px 14px; border-radius: 10px; background: rgba(14,14,17,.82);
      border: 1px solid rgba(109,94,245,.28); backdrop-filter: blur(6px);
      opacity: 0; transition: opacity .35s ease; }
    .sx-step.on { opacity: 1; animation: sx-fade-up .35s ease both; }
    .sx-step-num { color: ${PALETTE.blue}; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
    .sx-step-sep { width: 1px; height: 12px; background: rgba(255,255,255,.18); }
    .sx-step-name { color: #fff; font-size: 12px; font-weight: 650; letter-spacing: .08em; }
    .sx-caption { position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%);
      max-width: 560px; text-align: center; padding: 9px 18px; border-radius: 999px;
      background: rgba(5,5,5,.78); border: 1px solid rgba(255,255,255,.10); backdrop-filter: blur(6px);
      color: rgba(255,255,255,.94); font-size: 13px; line-height: 1.35; letter-spacing: .01em;
      opacity: 0; transition: opacity .35s ease; white-space: nowrap; }
    .sx-caption.on { opacity: 1; animation: sx-fade-up .35s ease both; }
    .sx-footnote { position: absolute; right: 20px; bottom: 22px; max-width: 260px; text-align: right;
      color: rgba(255,255,255,.42); font-size: 10px; line-height: 1.45; letter-spacing: .02em; }
    .sx-cursor { position: absolute; top: 0; left: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px;
      border-radius: 50%; border: 2px solid rgba(255,255,255,.9);
      background: rgba(59,130,246,.16); box-shadow: 0 0 0 1px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.4);
      opacity: 0; transition: opacity .25s ease; will-change: transform; }
    .sx-cursor.on { opacity: 1; }
    .sx-cursor.click { animation: sx-pulse .45s ease; }
    .sx-focus { position: absolute; border-radius: 10px; pointer-events: none;
      box-shadow: 0 0 0 2px ${PALETTE.blue}, 0 0 0 6px rgba(59,130,246,.18);
      opacity: 0; transition: opacity .3s ease, all .3s ease; }
    .sx-focus.on { opacity: 1; }
  `;

  const root = document.createElement('div');
  root.id = OVERLAY_ID;
  root.innerHTML = `
    <div class="sx-brand"><span class="sx-brand-mark"></span><span class="sx-brand-name">SECUREX</span></div>
    <div class="sx-step"><span class="sx-step-num"></span><span class="sx-step-sep"></span><span class="sx-step-name"></span></div>
    <div class="sx-caption"></div>
    <div class="sx-footnote"></div>
    <div class="sx-cursor"></div>
    <div class="sx-focus"></div>
  `;
  /**
   * `addInitScript` runs at document-start, where `document.body` is still
   * null. So the DOM half is built lazily, the first time the spec asks for an
   * element, by which point the body has always parsed.
   */
  const attach = () => {
    if (style.isConnected && root.isConnected) return;
    // Both are null at document-start, hence resolved on first use rather than
    // eagerly. By the time the spec drives the overlay, the DOM has parsed.
    if (!style.isConnected) document.head.appendChild(style);
    if (!root.isConnected) document.body.appendChild(root);
  };

  const q = <T extends Element>(sel: string) => {
    attach();
    return root.querySelector(sel) as T;
  };
  const stepEl = () => q<HTMLElement>('.sx-step');
  const stepNum = () => q<HTMLElement>('.sx-step-num');
  const stepName = () => q<HTMLElement>('.sx-step-name');
  const captionEl = () => q<HTMLElement>('.sx-caption');
  const footnoteEl = () => q<HTMLElement>('.sx-footnote');
  const cursorEl = () => q<HTMLElement>('.sx-cursor');
  const focusEl = () => q<HTMLElement>('.sx-focus');

  let clickTimer: number | undefined;

  w.__securexDemo = {
    /** Show a scene's step chip + caption. Null fields clear that part. */
    scene(scene: Scene) {
      if (scene.step) {
        stepNum().textContent = scene.step;
        stepName().textContent = scene.heading ?? scene.name;
        stepEl().classList.add('on');
      } else {
        stepEl().classList.remove('on');
      }
      if (scene.caption) {
        captionEl().textContent = scene.caption;
        captionEl().classList.add('on');
      } else {
        captionEl().classList.remove('on');
      }
    },
    /** Replace the caption only, leaving the step chip alone. */
    caption(text: string | null) {
      if (text) {
        captionEl().textContent = text;
        captionEl().classList.add('on');
      } else {
        captionEl().classList.remove('on');
      }
    },
    /** Hide the step chip and caption — used for clean transition frames. */
    clearScene() {
      stepEl().classList.remove('on');
      captionEl().classList.remove('on');
    },
    footnote(text: string | null) {
      footnoteEl().textContent = text ?? '';
    },
    /** Move the synthetic cursor. Coordinates are viewport pixels. */
    cursor(x: number, y: number) {
      const el = cursorEl();
      el.classList.add('on');
      el.style.transform = `translate(${x}px, ${y}px)`;
    },
    hideCursor() {
      cursorEl().classList.remove('on');
    },
    /** Flash the cursor ring to make a click legible in the recording. */
    click() {
      const el = cursorEl();
      el.classList.remove('click');
      void el.offsetWidth; // restart the animation
      el.classList.add('click');
      window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => el.classList.remove('click'), 460);
    },
    /**
     * Ring a viewport-relative rect to draw the eye to a status/result element.
     * Pass null to clear it.
     */
    focus(rect: { x: number; y: number; width: number; height: number } | null) {
      if (!rect) {
        focusEl().classList.remove('on');
        return;
      }
      const el = focusEl();
      el.style.left = `${rect.x - 6}px`;
      el.style.top = `${rect.y - 6}px`;
      el.style.width = `${rect.width + 12}px`;
      el.style.height = `${rect.height + 12}px`;
      el.classList.add('on');
    },
  };
}

export type OverlayApi = {
  scene(scene: Scene): void;
  caption(text: string | null): void;
  clearScene(): void;
  footnote(text: string | null): void;
  cursor(x: number, y: number): void;
  hideCursor(): void;
  click(): void;
  focus(rect: { x: number; y: number; width: number; height: number } | null): void;
};

/**
 * Install the overlay into every document the context will load.
 *
 * Uses `addInitScript` rather than a one-shot `evaluate` because the story
 * performs real navigations; an init script re-runs on each new document, so
 * the overlay is present for scene one and for the closing frame alike.
 */
export async function installOverlay(context: {
  addInitScript(fn: (config: OverlayConfig) => void, arg: OverlayConfig): Promise<void>;
}): Promise<void> {
  await context.addInitScript(mountOverlay, { overlayId: OVERLAY_ID, palette: PALETTE });
}

async function call<T>(page: Page, method: keyof OverlayApi, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    ([m, a]) => {
      const api = (window as unknown as Record<string, Record<string, unknown>>).__securexDemo;
      if (!api) throw new Error('SecureX demo overlay is not installed');
      return (api[m as string] as (...x: unknown[]) => unknown)(...(a as unknown[]));
    },
    [method, args] as [string, unknown[]],
  ) as Promise<T>;
}

export const overlay = {
  scene: (page: Page, scene: Scene) => call<void>(page, 'scene', scene),
  caption: (page: Page, text: string | null) => call<void>(page, 'caption', text),
  clearScene: (page: Page) => call<void>(page, 'clearScene'),
  footnote: (page: Page, text: string | null) => call<void>(page, 'footnote', text),
  cursor: (page: Page, x: number, y: number) => call<void>(page, 'cursor', x, y),
  hideCursor: (page: Page) => call<void>(page, 'hideCursor'),
  click: (page: Page) => call<void>(page, 'click'),
  focus: (
    page: Page,
    rect: { x: number; y: number; width: number; height: number } | null,
  ) => call<void>(page, 'focus', rect),

  /** Convenience for the closing frame's honesty footnote. */
  closingFootnote: (page: Page) => call<void>(page, 'footnote', CLOSING_FOOTNOTE),
};
