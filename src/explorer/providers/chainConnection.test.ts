import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api/client';
import { isTransientChainError } from '../services/chainApi';
import {
  deriveConnection,
  shouldRetrySoon,
  type ChainConnectionInput,
} from './chainConnection';

/**
 * The Explorer runs on Render's free plan, so its upstream node sleeps when
 * idle and needs roughly twenty seconds to cold-start. These tests pin the
 * honesty rules that keep that from being reported to a visitor as a broken
 * network — and, more importantly, keep it from ever being reported as a
 * healthy one when it is not.
 */

const base: ChainConnectionInput = {
  everSucceeded: false,
  inFlight: false,
  error: null,
  transient: false,
  attemptsMade: 0,
  exhausted: false,
  nodeStatus: null,
};

function input(overrides: Partial<ChainConnectionInput>): ChainConnectionInput {
  return { ...base, ...overrides };
}

describe('deriveConnection', () => {
  describe('operational', () => {
    it('is reached when a real health request succeeded and the node is up', () => {
      const result = deriveConnection(
        input({ everSucceeded: true, nodeStatus: 'UP' }),
      );

      expect(result.state).toBe('operational');
      expect(result.label).toBe('Operational');
      expect(result.tone).toBe('ok');
      expect(result.title).toBeNull();
    });

    it('treats RUNNING as healthy, which is what the node actually reports', () => {
      expect(deriveConnection(input({ everSucceeded: true, nodeStatus: 'RUNNING' })).state).toBe(
        'operational',
      );
    });

    it('stays operational through a background refresh so the page does not flail', () => {
      const result = deriveConnection(
        input({ everSucceeded: true, inFlight: true, nodeStatus: 'UP' }),
      );

      expect(result.state).toBe('operational');
    });

    it('never claims operational without a successful read', () => {
      // Nothing has succeeded, whatever else is true of the request.
      const firstEverAttempt = deriveConnection(input({ inFlight: true }));
      expect(firstEverAttempt.state).not.toBe('operational');

      // A success that has since been followed by a failure is history, not
      // evidence about the present.
      const staleSuccess = deriveConnection(
        input({
          everSucceeded: true,
          error: 'The blockchain service is unreachable.',
          transient: true,
          attemptsMade: 1,
          nodeStatus: 'UP',
        }),
      );
      expect(staleSuccess.state).not.toBe('operational');
    });

    it('reports a degraded node honestly instead of collapsing it to healthy', () => {
      const result = deriveConnection(input({ everSucceeded: true, nodeStatus: 'DEGRADED' }));

      expect(result.tone).toBe('warn');
      expect(result.label).toBe('DEGRADED');
      expect(result.detail).toMatch(/degraded/i);
    });
  });

  describe('connecting', () => {
    it('is the first-ever attempt, with nothing known and nothing failed', () => {
      const result = deriveConnection(input({ inFlight: true }));

      expect(result.state).toBe('connecting');
      expect(result.label).toBe('Connecting');
      // Nothing has gone wrong, so there is nothing to apologise for.
      expect(result.title).toBeNull();
    });
  });

  describe('waking — the state that used to be missing', () => {
    it('reports a retrying sleep as waking, not as an outage', () => {
      const result = deriveConnection(
        input({ inFlight: true, error: 'The blockchain service is unreachable.', transient: true, attemptsMade: 1 }),
      );

      expect(result.state).toBe('waking');
      expect(result.label).toBe('Waking');
      expect(result.willRetry).toBe(true);
    });

    it('stays waking between attempts while budget remains', () => {
      const result = deriveConnection(
        input({
          error: 'The blockchain service is unreachable.',
          transient: true,
          attemptsMade: 2,
          exhausted: false,
        }),
      );

      expect(result.state).toBe('waking');
      expect(result.detail).toMatch(/attempt 3/i);
    });

    it('recovers to operational when the node wakes up', () => {
      const asleep = deriveConnection(
        input({ error: 'unreachable', transient: true, attemptsMade: 3, inFlight: true }),
      );
      expect(asleep.state).toBe('waking');

      const awake = deriveConnection(input({ everSucceeded: true, nodeStatus: 'UP' }));
      expect(awake.state).toBe('operational');
    });

    it('explains the free-tier sleep rather than implying the network is broken', () => {
      const result = deriveConnection(
        input({ error: 'unreachable', transient: true, attemptsMade: 1 }),
      );

      expect(result.detail).toMatch(/reconnect/i);
    });
  });

  describe('unavailable', () => {
    it('is reached only after the bounded budget is spent', () => {
      const result = deriveConnection(
        input({ error: 'unreachable', transient: true, attemptsMade: 5, exhausted: true }),
      );

      expect(result.state).toBe('unavailable');
      expect(result.willRetry).toBe(false);
      // It reports how many attempts actually happened rather than a vague claim.
      expect(result.detail).toMatch(/after 5 attempts/i);
    });

    it('uses the singular when only one attempt was made', () => {
      const result = deriveConnection(
        input({ error: 'unreachable', transient: true, attemptsMade: 1, exhausted: true }),
      );

      expect(result.detail).toMatch(/after 1 attempt\b/i);
    });

    it('reports a non-retryable failure immediately, without burning the budget', () => {
      const result = deriveConnection(
        input({ error: 'Unauthorized', transient: false, attemptsMade: 1, exhausted: false }),
      );

      expect(result.state).toBe('unavailable');
      expect(result.detail).toBe('Unauthorized');
    });
  });

  it('transitions through the whole recovery arc without inventing a state', () => {
    const arc = [
      deriveConnection(input({ inFlight: true })),
      deriveConnection(input({ error: 'unreachable', transient: true, attemptsMade: 1, inFlight: true })),
      deriveConnection(input({ error: 'unreachable', transient: true, attemptsMade: 3 })),
      deriveConnection(input({ everSucceeded: true, nodeStatus: 'UP' })),
      deriveConnection(input({ error: 'unreachable', transient: true, attemptsMade: 5, exhausted: true })),
    ].map((c) => c.state);

    expect(arc).toEqual(['connecting', 'waking', 'waking', 'operational', 'unavailable']);
  });
});

describe('shouldRetrySoon', () => {
  it('retries a transient failure that still has budget', () => {
    expect(shouldRetrySoon({ error: 'unreachable', transient: true, exhausted: false })).toBe(true);
  });

  it('stops once the budget is spent', () => {
    expect(shouldRetrySoon({ error: 'unreachable', transient: true, exhausted: true })).toBe(false);
  });

  it('never retries a genuine fault, which could only add load', () => {
    expect(shouldRetrySoon({ error: 'Unauthorized', transient: false, exhausted: false })).toBe(false);
  });

  it('does not retry when there is nothing wrong', () => {
    expect(shouldRetrySoon({ error: null, transient: false, exhausted: false })).toBe(false);
  });
});

describe('transient classification inputs', () => {
  // Guards the reasoning the states above depend on: the statuses the Platform
  // API returns when it has exhausted its own retries against a sleeping node
  // must be treated as retryable, and answers from the service must not be.
  it.each([
    ['timeout with no status', 0],
    ['render edge rate limit', 429],
    ['upstream unreachable (BLOCKCHAIN_UNREACHABLE)', 502],
    ['service unavailable', 503],
    ['gateway timeout', 504],
  ])('treats %s as transient', (_label, status) => {
    expect(isTransientChainError(new ApiError('boom', status))).toBe(true);
  });

  it.each([
    ['unauthorized', 401],
    ['forbidden', 403],
    ['not found', 404],
    ['server error', 500],
  ])('treats %s as a genuine failure', (_label, status) => {
    expect(isTransientChainError(new ApiError('boom', status))).toBe(false);
  });
});