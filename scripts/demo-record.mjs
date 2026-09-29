#!/usr/bin/env node
/**
 * SecureX demo recorder — orchestrator.
 *
 *   npm run demo:record
 *
 * Runs the whole recording with no human input:
 *   1. clears previous artifacts so a run can never inherit an old video
 *   2. starts the DEMO dev server (and always stops it again)
 *   3. builds a fake-camera clip of the app's real QR, so scene 07 can use the
 *      product's real camera scanner
 *   4. runs the recorder through its own Playwright config
 *   5. converts the WebM to MP4 and grabs a thumbnail, when ffmpeg is present
 *
 * Every failure path preserves what exists, names the scene that broke, and
 * exits non-zero. It never publishes a partial recording as if it were whole.
 */

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'securex-demo');
const PW_OUTPUT_DIR = path.join(ARTIFACT_DIR, '.playwright');
const VIDEO_POINTER = path.join(ARTIFACT_DIR, '.video-path');
const LOG_FILE = path.join(ARTIFACT_DIR, 'recorder.log');

const BASE_URL = process.env.SECUREX_DEMO_BASE_URL ?? 'http://localhost:3000';
const WEBM = path.join(ARTIFACT_DIR, 'SecureX-Demo.webm');
const MP4 = path.join(ARTIFACT_DIR, 'SecureX-Demo.mp4');
const THUMBNAIL = path.join(ARTIFACT_DIR, 'SecureX-Demo-Thumbnail.png');

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function say(line = '') {
  process.stdout.write(`${line}\n`);
}

let logStream = null;
/** Everything the recorder prints is also kept on disk for post-mortems. */
function record(line) {
  const text = `${line}\n`;
  process.stdout.write(text);
  logStream?.write(text);
}

/** Run a command, resolving with its exit code rather than throwing. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'pipe', ...opts });
    let out = '';
    const capture = (buf) => {
      out += buf.toString();
    };
    child.stdout?.on('data', capture);
    child.stderr?.on('data', capture);
    child.on('error', (error) => resolve({ code: 127, out: `${out}\n${error.message}` }));
    child.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

/** Run a command with output streamed straight to the terminal. */
function runInherit(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
    child.on('error', (error) => resolve({ code: 127 }));
    child.on('close', (code) => resolve({ code: code ?? 1 }));
  });
}

async function waitForServer(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) return true;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

/** Is something already serving the app? If so, leave it alone. */
async function serverAlreadyRunning() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function hasFfmpeg() {
  const { code } = await run('ffmpeg', ['-version']);
  return code === 0;
}

/** Find the recorded WebM: prefer the spec's pointer, else scan the output dir. */
async function findRecording() {
  try {
    const pointer = (await fs.readFile(VIDEO_POINTER, 'utf8')).trim();
    if (pointer) {
      const resolved = path.isAbsolute(pointer) ? pointer : path.join(ROOT, pointer);
      try {
        await fs.access(resolved);
        return resolved;
      } catch {
        // Pointer went stale; fall through to a scan.
      }
    }
  } catch {
    // No pointer written — the run failed before the last scene.
  }

  const found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.webm')) found.push(full);
    }
  }
  await walk(PW_OUTPUT_DIR);

  if (found.length === 0) return null;
  // The story is a single test, so there should be exactly one segment. If
  // there is more, take the largest rather than guessing wrong.
  let best = found[0];
  for (const candidate of found) {
    const a = await fs.stat(candidate);
    const b = await fs.stat(best);
    if (a.size > b.size) best = candidate;
  }
  return best;
}

/** Convert to broadly compatible H.264/AAC, and pull a closing-frame still. */
async function exportMedia(hasFfmpegTool) {
  const results = { mp4: false, thumbnail: false, skipped: null };

  if (!hasFfmpegTool) {
    results.skipped =
      'ffmpeg was not found on PATH, so the MP4 conversion and thumbnail were skipped. The WebM recording is complete and playable.';
    return results;
  }

  const mp4 = await run('ffmpeg', [
    '-y',
    '-i', WEBM,
    // H.264 + AAC in a faststart MP4: plays in browsers, QuickTime and Slack.
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    MP4,
  ]);
  if (mp4.code === 0) {
    results.mp4 = true;
  } else {
    results.skipped = `ffmpeg could not write the MP4:\n${mp4.out.slice(-1500)}`;
  }

  // Thumbnail from near the end, where the closing brand frame is held.
  const thumb = await run('ffmpeg', [
    '-y',
    '-sseof', '-6',
    '-i', WEBM,
    '-frames:v', '1',
    '-q:v', '2',
    THUMBNAIL,
  ]);
  if (thumb.code === 0) {
    results.thumbnail = true;
  }

  return results;
}

async function fileSize(file) {
  try {
    const { size } = await fs.stat(file);
    return size;
  } catch {
    return 0;
  }
}

function humanSize(bytes) {
  if (!bytes) return '0 B';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

/** Duration in seconds, via ffprobe when available. */
async function durationSeconds() {
  const probe = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    WEBM,
  ]);
  const value = Number.parseFloat(probe.out.trim());
  return Number.isFinite(value) ? value : null;
}

async function main() {
  record(c.bold(c.cyan('\n  SecureX — automated demo recorder')));
  record(c.dim(`  ${new Date().toISOString()}`));
  record(c.dim(`  target: ${BASE_URL}  ·  output: artifacts/securex-demo/\n`));

  // ── 1. clean slate ────────────────────────────────────────────────
  await fs.rm(ARTIFACT_DIR, { recursive: true, force: true });
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  logStream = createWriteStream(LOG_FILE, { flags: 'a' });

  // ── 2. dev server ─────────────────────────────────────────────────
  let server = null;
  const alreadyRunning = await serverAlreadyRunning();
  if (alreadyRunning) {
    record(c.yellow(`  ▸ reusing the dev server already on ${BASE_URL}`));
  } else {
    record(c.dim('  ▸ starting the DEMO dev server (VITE_USE_MOCK=true)'));
    server = spawn('npm', ['run', 'dev'], {
      cwd: ROOT,
      stdio: 'ignore',
      env: { ...process.env, VITE_USE_MOCK: 'true' },
      detached: false,
    });
  }

  try {
    if (!(await waitForServer(BASE_URL))) {
      throw new Error(
        `The SecureX dev server did not become reachable at ${BASE_URL} within 90s. ` +
          'Start it yourself with `VITE_USE_MOCK=true npm run dev`, or check port 3000.',
      );
    }
    record(c.green('  ▸ dev server ready'));

    // ── 3. fake camera clip of the app's real QR ────────────────────
    const ffmpegAvailable = await hasFfmpeg();
    const clip = await buildCameraClip();
    const env = { ...process.env, SECUREX_DEMO_BASE_URL: BASE_URL };
    if (clip.ok) {
      record(c.green('  ▸ fake-camera clip built from the app\'s live QR'));
      env.SECUREX_DEMO_FAKE_CAMERA = clip.file;
    } else {
      record(
        c.yellow(`  ▸ fake camera unavailable (${clip.reason}) — scene 07 will use the ID route`),
      );
    }

    // ── 4. record ────────────────────────────────────────────────────
    record(c.dim('\n  recording…\n'));
    const run1 = await runInherit(
      'npx',
      ['playwright', 'test', '--config', 'playwright.demo.config.ts', '--reporter=list'],
      { env },
    );

    const recording = await findRecording();
    if (recording) {
      await fs.copyFile(recording, WEBM);
      await fs.rm(VIDEO_POINTER, { force: true });
      record(c.green(`\n  ▸ WebM  ${path.relative(ROOT, WEBM)}  (${humanSize(await fileSize(WEBM))})`));
    }

    if (run1.code !== 0) {
      // The spec already wrote failure.png / failure.log naming the scene.
      record('');
      record(c.red(c.bold('  SecureX Demo Recorder FAILED')));
      const log = await fs.readFile(path.join(ARTIFACT_DIR, 'failure.log'), 'utf8').catch(
        () => '(no failure.log written)',
      );
      record(log.split('\n').map((l) => `  ${l}`).join('\n'));
      if (recording) {
        record(
          c.yellow(
            `\n  The partial recording was preserved: ${path.relative(ROOT, WEBM)}`,
          ),
        );
      }
      return 1;
    }

    if (!recording) {
      record(c.red('\n  The run reported success but produced no video file.'));
      return 1;
    }

    // ── 5. MP4 + thumbnail ───────────────────────────────────────────
    const media = await exportMedia(ffmpegAvailable);
    if (media.mp4) {
      record(c.green(`  ▸ MP4   ${path.relative(ROOT, MP4)}  (${humanSize(await fileSize(MP4))})`));
    }
    if (media.thumbnail) {
      record(c.green(`  ▸ thumb ${path.relative(ROOT, THUMBNAIL)}`));
    }
    if (media.skipped) {
      record(c.yellow(`\n  note: ${media.skipped}`));
    }

    const seconds = await durationSeconds();
    if (seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.round(seconds % 60);
      record(c.dim(`  ▸ runtime ${m}m ${String(s).padStart(2, '0')}s`));
      if (seconds > 420) {
        record(c.yellow('  note: the recording is longer than the 3-5 minute target.'));
      }
    }

    record('');
    record(c.bold(c.green('  SecureX demo recorded successfully.')));
    record(c.dim(`  Play: ${path.relative(ROOT, MP4)}  (or the .webm next to it)\n`));
    return 0;
  } catch (error) {
    record('');
    record(c.red(c.bold('  SecureX Demo Recorder FAILED')));
    record(`  ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    logStream?.end();
    if (server) {
      server.kill('SIGTERM');
      // Give Vite a moment to release the port before the shell returns.
      await Promise.race([once(server, 'close'), new Promise((r) => setTimeout(r, 3000))]);
      record(c.dim('\n  ▸ dev server stopped'));
    }
  }
}

/**
 * Build the fake-camera clip via the recorder's own TS module.
 * Uses tsx (already a dev dependency) so no build step is required.
 */
async function buildCameraClip() {
  const { code, out } = await run(
    'npx',
    ['tsx', 'scripts/build-demo-camera-clip.mts'],
    { env: { ...process.env, SECUREX_DEMO_BASE_URL: BASE_URL } },
  );
  if (code === 0) {
    const file = out.trim().split('\n').pop()?.trim();
    if (file) return { ok: true, file };
    return { ok: false, reason: 'clip builder produced no path' };
  }
  return { ok: false, reason: out.trim().split('\n').pop()?.trim() || 'clip build failed' };
}

process.exitCode = await main();
