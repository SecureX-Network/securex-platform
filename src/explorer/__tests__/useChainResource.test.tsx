import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useChainResource } from '../hooks/useChainResource';
import { ApiError } from '../../services/api/client';

/**
 * Polling behaviour of the Explorer's data hook.
 *
 * The upstream is a free-tier blockchain node reached through a free-tier API.
 * A public explorer with many open tabs can therefore be the thing that keeps an
 * already-struggling service down. These tests pin the two behaviours that
 * prevent that: no requests while the tab is hidden, and an exponential backoff
 * while the upstream keeps failing.
 *
 * The second half covers the bounded recovery ladder, which only the chain
 * summary opts into: a sleeping node is retried on a short ladder, but only a
 * fixed number of times, and then the hook stops rather than spinning forever.
 */

const POLL_MS = 1000;

// A deliberately short ladder so the test can walk all of it in fake time.
const RECOVERY = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 400 };

// Module-scoped so the probe component can read the current loader without
// threading it through props or reaching onto `globalThis`.
let loader: ReturnType<typeof vi.fn>;

function Probe({
  pollMs = POLL_MS,
  recovery,
}: {
  pollMs?: number;
  recovery?: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number };
}) {
  const resource = useChainResource(() => loader(), { pollMs, recovery });
  return (
    <div>
      <span data-testid="errors">{resource.error ?? 'none'}</span>
      <span data-testid="updated">{resource.updatedAt ? 'yes' : 'no'}</span>
      <span data-testid="transient">{String(resource.transient)}</span>
      <span data-testid="inflight">{String(resource.inFlight)}</span>
      <span data-testid="loading">{String(resource.loading)}</span>
      <span data-testid="exhausted">{String(resource.exhausted)}</span>
      <span data-testid="attempts">{resource.attemptsMade}</span>
      <button onClick={resource.reload}>refresh</button>
    </div>
  );
}

describe('useChainResource polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loader = vi.fn(async () => ({ ok: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads once and then polls at the configured interval', async () => {
    render(<Probe />);
    await act(async () => {});
    expect(loader).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(loader).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('makes no requests while the tab is hidden', async () => {
    render(<Probe />);
    await act(async () => {});
    expect(loader).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });

    // Several intervals elapse with the tab hidden: the timer must fire but
    // must not call the loader.
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 5);
    });
    expect(loader).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });

    // Returning to the tab refetches immediately.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially while the upstream keeps failing', async () => {
    loader.mockRejectedValue(new Error('rate limited'));
    render(<Probe />);
    await act(async () => {});
    expect(loader).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('errors')).toHaveTextContent('rate limited');

    // First retry after one failed load: one interval.
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(loader).toHaveBeenCalledTimes(2);

    // Second failure: the wait has doubled, so one interval is no longer enough.
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(loader).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 2);
    });
    expect(loader).toHaveBeenCalledTimes(3);

    // Third failure: doubled again. Still no request at two intervals.
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 2);
    });
    expect(loader).toHaveBeenCalledTimes(3);

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 4);
    });
    expect(loader).toHaveBeenCalledTimes(4);
  });

  it('returns to the normal interval once the upstream recovers', async () => {
    loader.mockRejectedValue(new Error('down'));
    render(<Probe />);
    await act(async () => {});
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(loader).toHaveBeenCalledTimes(2);

    loader.mockResolvedValue({ ok: true });
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 2);
    });
    expect(loader).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('errors')).toHaveTextContent('none');

    // Backoff is cleared: a single normal interval polls again.
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
    });
    expect(loader).toHaveBeenCalledTimes(4);
  });

  it('lets a visitor retry manually regardless of the backoff window', async () => {
    loader.mockRejectedValue(new Error('down'));
    render(<Probe />);
    await act(async () => {});
    expect(loader).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByRole('button', { name: 'refresh' }).click();
    });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

/**
 * The Platform API surfaces a sleeping node as a 502 `BLOCKCHAIN_UNREACHABLE`
 * once its own retries are spent, and 0 when our request timed out. Both mean
 * "the node is asleep", and both are worth retrying quickly.
 */
const asleep = () => new ApiError('The blockchain service is unreachable.', 502);

describe('useChainResource bounded recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loader = vi.fn(async () => ({ ok: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Each rung is advanced in its own `act` because the next timer is armed by
  // the state update that the previous attempt's failure triggered; advancing
  // past it in a single call would race the re-arm.
  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  it('recovers on a short ladder instead of the full poll interval', async () => {
    loader.mockRejectedValue(asleep());
    render(<Probe recovery={RECOVERY} />);
    await act(async () => {});
    expect(loader).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('transient')).toHaveTextContent('true');

    // The first recovery retry comes after 100ms — not after a full poll
    // interval. This is the whole point of the ladder, and it is what makes a
    // ~22s cold start read as a brief reconnect instead of a long outage.
    await advance(RECOVERY.baseDelayMs);
    expect(loader).toHaveBeenCalledTimes(2);

    // Then it doubles: 200ms. Half of that is not enough.
    await advance(RECOVERY.baseDelayMs);
    expect(loader).toHaveBeenCalledTimes(2);
    await advance(RECOVERY.baseDelayMs);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('stops after the bounded budget instead of retrying forever', async () => {
    loader.mockRejectedValue(asleep());
    render(<Probe recovery={RECOVERY} />);
    await act(async () => {});
    expect(loader).toHaveBeenCalledTimes(1);

    // Walk the ladder to the end: 100, then 200.
    await advance(100);
    await advance(200);
    expect(loader).toHaveBeenCalledTimes(RECOVERY.maxAttempts);

    // The ladder is spent and the hook says so.
    expect(screen.getByTestId('exhausted')).toHaveTextContent('true');
    expect(screen.getByTestId('attempts')).toHaveTextContent(String(RECOVERY.maxAttempts));

    // Crucially, it then goes quiet. A retry loop with no ceiling is just a way
    // of keeping a struggling free-tier node down.
    await advance(60_000);
    expect(loader).toHaveBeenCalledTimes(RECOVERY.maxAttempts);
  });

  it('starts a fresh bounded cycle when the visitor asks to retry', async () => {
    loader.mockRejectedValue(asleep());
    render(<Probe recovery={RECOVERY} />);
    await act(async () => {});
    await advance(100);
    await advance(200);
    expect(loader).toHaveBeenCalledTimes(RECOVERY.maxAttempts);

    await act(async () => {
      screen.getByRole('button', { name: 'refresh' }).click();
    });

    // The budget reset, so the new cycle gets the whole ladder again rather
    // than inheriting an exhausted one and giving up immediately.
    expect(loader).toHaveBeenCalledTimes(RECOVERY.maxAttempts + 1);
    expect(screen.getByTestId('attempts')).toHaveTextContent('1');

    await advance(RECOVERY.baseDelayMs);
    expect(loader).toHaveBeenCalledTimes(RECOVERY.maxAttempts + 2);
  });

  it('resets the budget as soon as the node answers', async () => {
    loader.mockRejectedValue(asleep());
    render(<Probe recovery={RECOVERY} />);
    await act(async () => {});
    await advance(100);
    expect(loader).toHaveBeenCalledTimes(2);

    loader.mockResolvedValue({ ok: true });
    await advance(200);
    expect(loader).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('errors')).toHaveTextContent('none');
    expect(screen.getByTestId('exhausted')).toHaveTextContent('false');
    expect(screen.getByTestId('attempts')).toHaveTextContent('0');

    // Steady state is the normal poll interval again, not the recovery ladder.
    await advance(POLL_MS);
    expect(loader).toHaveBeenCalledTimes(4);
  });

  it('does not burn a retry budget on a failure retrying cannot fix', async () => {
    // A 401 is an answer from the service, not a sleeping node. Retrying it is
    // pure load with no possible benefit.
    loader.mockRejectedValue(new ApiError('Unauthorized', 401));
    render(<Probe recovery={RECOVERY} />);
    await act(async () => {});
    expect(screen.getByTestId('transient')).toHaveTextContent('false');

    await advance(60_000);

    // Reported immediately and never declared exhausted: there is no budget to
    // spend, because retrying was never going to be the answer.
    expect(screen.getByTestId('exhausted')).toHaveTextContent('false');
    // It still backs off on the ordinary poll ladder rather than spinning.
    expect(loader.mock.calls.length).toBeLessThan(10);
  });

  it('stays in flight during a retry that has no data yet', async () => {
    // A retry before the first success has no data on screen, so it sets neither
    // `loading` (skeleton) nor `refreshing` (data already shown). Without an
    // explicit in-flight signal the UI would read that as idle and drop back to
    // "Connecting" for the whole attempt, right after saying the node was asleep.
    //
    // The loader is held open so the attempt can be observed while it is running
    // rather than after it has settled.
    const pending: Array<{ reject: (e: unknown) => void }> = [];
    loader.mockImplementation(
      () => new Promise((_resolve, reject) => pending.push({ reject })),
    );

    render(<Probe recovery={RECOVERY} />);
    await act(async () => {});
    expect(screen.getByTestId('inflight')).toHaveTextContent('true');

    await act(async () => {
      pending.shift()!.reject(asleep());
    });
    expect(screen.getByTestId('inflight')).toHaveTextContent('false');

    // The retry is now in flight and there is still no data on screen. This is
    // the state that used to be indistinguishable from idle.
    await advance(RECOVERY.baseDelayMs);
    expect(screen.getByTestId('inflight')).toHaveTextContent('true');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('does not silently restart a spent budget when the tab becomes visible', async () => {
    loader.mockRejectedValue(asleep());
    render(<Probe recovery={RECOVERY} />);
    await act(async () => {});
    await advance(100);
    await advance(200);
    expect(loader).toHaveBeenCalledTimes(RECOVERY.maxAttempts);

    // Re-entering the visible state is not a decision to retry, and a dozen
    // tabs all waking the same cold node at once is exactly the load it cannot
    // absorb. The honest state stays put until the visitor presses Retry.
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(loader).toHaveBeenCalledTimes(RECOVERY.maxAttempts);
    expect(screen.getByTestId('exhausted')).toHaveTextContent('true');
  });
});
