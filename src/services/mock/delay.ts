import { MOCK_DELAY } from '@/constants';

/**
 * Artificial latency used by the demo/mock data layer.
 *
 * This lives in its own module, separate from the mock fixtures, so that a
 * consumer which only needs a delay does not pull the whole demo dataset into
 * its bundle. `src/services/mock/index.ts` re-exports it, so existing
 * `import { mockDelay } from '@/services/mock'` call sites are unchanged.
 */
export function mockDelay(ms: number = MOCK_DELAY): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });
}
