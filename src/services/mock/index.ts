import { MOCK_DELAY } from '@/constants';

export * from './data';

export function mockDelay(ms: number = MOCK_DELAY): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });
}