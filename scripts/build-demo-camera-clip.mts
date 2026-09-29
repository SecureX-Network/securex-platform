/**
 * Builds the fake-camera clip used by scene 07 and prints its path.
 *
 * Kept as a file rather than an inline `tsx -e` snippet: the module imports a
 * sibling `.ts` file, and the inline form cannot resolve that specifier.
 *
 * Prints the Y4M path on stdout, or a one-line reason on stderr with exit 2.
 * The orchestrator treats exit 2 as "run scene 07 on the ID route instead".
 */

import { buildFakeCameraClip } from '../e2e/demo/demo-qr-camera.ts';

const baseURL = process.env.SECUREX_DEMO_BASE_URL ?? 'http://localhost:3000';
const result = await buildFakeCameraClip(baseURL);

if ('error' in result) {
  process.stderr.write(`${result.error}\n`);
  process.exit(2);
}

process.stdout.write(`${result.file}\n`);
