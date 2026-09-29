/**
 * SecureX demo recorder — real QR verification through a fake camera.
 *
 * The employer scene is much stronger if the app's own scanner really decodes a
 * real SecureX QR, rather than the recorder typing an ID. Chromium accepts a
 * Y4M file as a fake webcam (`--use-file-for-fake-video-capture`), so we can
 * feed it the exact QR the app itself rendered one scene earlier.
 *
 * Nothing about the verification is faked: the pixels are the app's own
 * `qrcode.react` output, rasterised by the browser, pushed through Chromium's
 * real camera pipeline, and decoded by the app's real `jsQR` scanner, which
 * then performs its normal platform lookup. Only the light sensor is simulated.
 *
 * The frame is produced by screenshotting the rendered SVG and compositing it
 * in a canvas, rather than by re-deriving the module grid from the SVG path
 * data. A hand-rolled rasteriser is the obvious shortcut and it is wrong:
 * sub-pixel path coordinates and the viewBox/module mapping do not round-trip,
 * and jsQR silently refuses the result. Letting the browser rasterise the same
 * SVG the viewer sees removes that whole class of error.
 *
 * The two phases are split because the launch argument must be present at
 * browser start, while the QR is only readable once a page has rendered:
 *
 *   1. `captureQrFrame()` — throwaway browser: load the holder share page,
 *      screenshot the QR, composite it to a 640x480 white-padded frame.
 *   2. `writeY4m()`       — wrap that frame in a Y4M the fake camera reads.
 *
 * If either phase fails, the caller falls back to the app's supported
 * credential-ID route and says so on screen. It never invents a result.
 */

import { chromium, type Browser, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ACCOUNTS, VIEWPORT } from './demo-config';

/** Camera frame geometry. 4:3 matches the app's own scanner ideal request. */
const CAMERA = { width: 640, height: 480 } as const;

export interface QrCapture {
  /** Base64 RGBA, CAMERA.width * CAMERA.height * 4 bytes. */
  rgbaBase64: string;
}

/** Chromium launch args that turn a Y4M file into a webcam. */
export function fakeCameraArgs(y4mPath: string): string[] {
  return [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-video-capture=${y4mPath}`,
  ];
}

/**
 * Screenshot the share page's QR and flatten it into a camera-sized frame.
 *
 * The compositing runs inside the probe page: the browser draws the PNG it just
 * produced onto a white canvas at the largest whole-pixel scale that fits,
 * which keeps the module edges crisp for the decoder.
 */
async function renderFrameInPage(page: Page, png: Buffer): Promise<QrCapture> {
  return page.evaluate(
    async ({ src, width, height }) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('QR raster failed to load'));
        img.src = src;
      });

      const margin = 16;
      const scale = Math.max(
        1,
        Math.floor(Math.min(width - margin * 2, height - margin * 2) / img.width),
      );
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = Math.round((width - drawW) / 2);
      const dy = Math.round((height - drawH) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('no 2d context');
      ctx.imageSmoothingEnabled = false;
      // A QR needs a light quiet zone to lock onto, and the app renders the
      // symbol without a margin of its own (includeMargin={false}).
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const bytes = ctx.getImageData(0, 0, width, height).data;
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      return { rgbaBase64: btoa(binary) };
    },
    {
      src: `data:image/png;base64,${png.toString('base64')}`,
      width: CAMERA.width,
      height: CAMERA.height,
    },
  );
}

/**
 * Phase 1: render the holder share page in a throwaway browser and read its QR.
 *
 * The session is seeded into localStorage exactly as the existing e2e suite
 * does, because the QR belongs to the holder's first credential and the
 * recorder is about to sign in as that holder for real.
 */
export async function captureQrFrame(baseURL: string): Promise<QrCapture> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: VIEWPORT });
    await context.addInitScript(
      ({ user }) => {
        window.localStorage.setItem('securex_auth_user', JSON.stringify(user));
        window.localStorage.setItem('securex_auth_token', 'securex-demo-probe');
      },
      {
        user: {
          id: 'usr-holder-001',
          email: ACCOUNTS.holder.email,
          name: ACCOUNTS.holder.name,
          role: ACCOUNTS.holder.role,
        },
      },
    );
    const page = await context.newPage();
    await page.goto(new URL('/share', baseURL).toString(), {
      waitUntil: 'domcontentloaded',
    });
    const qr = page.locator('svg[role="img"]').first();
    await qr.waitFor({ timeout: 20_000 });
    // qrcode.react can paint in two passes; settle before sampling.
    await page.waitForTimeout(700);
    const png = await qr.screenshot();
    return await renderFrameInPage(page, png);
  } finally {
    await browser?.close();
  }
}

/**
 * Phase 2: wrap one RGBA frame in a Y4M clip.
 *
 * Luma-only output is sufficient: with U and V pinned to the neutral 128 the
 * frame is a true greyscale image of the QR. The symbol is repeated across
 * frames, which is what a holder holding a phone steady looks like to a camera.
 */
export async function writeY4m(
  rgbaBase64: string,
  filePath: string,
  options: { frames?: number; fps?: number } = {},
): Promise<string> {
  const { width, height } = CAMERA;
  // Chromium loops the file, so a short clip is enough and keeps it small.
  const frames = options.frames ?? 10;
  const fps = options.fps ?? 25;

  const rgba = Buffer.from(rgbaBase64, 'base64');
  if (rgba.length !== width * height * 4) {
    throw new Error(`unexpected frame size ${rgba.length}`);
  }

  // BT.601 luma, which is what Chromium's camera pipeline expects from Y4M.
  const y = Buffer.alloc(width * height);
  for (let i = 0, px = 0; px < width * height; px += 1, i += 4) {
    y[px] = Math.round(
      0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2],
    );
  }
  const chroma = Buffer.alloc((width / 2) * (height / 2), 128);

  const header = Buffer.from(
    `YUV4MPEG2 W${width} H${height} F${fps}:1 Ip A1:1 C420mpeg2\n`,
    'ascii',
  );
  const frameTag = Buffer.from('FRAME\n', 'ascii');

  const chunks: Buffer[] = [header];
  for (let f = 0; f < frames; f += 1) {
    chunks.push(frameTag, y, chroma, chroma);
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.concat(chunks));
  return filePath;
}

/**
 * Build the fake-camera clip in a temp directory.
 *
 * Returns null — never throws — when the QR cannot be captured, so the caller
 * can fall back to the credential-ID route instead of failing the recording.
 */
export async function buildFakeCameraClip(
  baseURL: string,
): Promise<{ file: string } | { error: string }> {
  try {
    const frame = await captureQrFrame(baseURL);
    if (!frame.rgbaBase64) {
      return { error: 'QR frame raster was empty' };
    }
    const file = path.join(os.tmpdir(), 'securex-demo-qr-fake-camera.y4m');
    await writeY4m(frame.rgbaBase64, file);
    return { file };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
