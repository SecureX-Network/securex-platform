import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useChainResource } from '../hooks/useChainResource';

/**
 * Polling behaviour of the Explorer's data hook.
 *
 * The upstream is a free-tier blockchain node reached through a free-tier API.
 * A public explorer with many open tabs can therefore be the thing that keeps an
 * already-struggling service down. These tests pin the two behaviours that
 * prevent that: no requests while the tab is hidden, and an exponential backoff
 * while the upstream keeps failing.
 */

const POLL_MS = 1000;

// Module-scoped so the probe component can read the current loader without
// threading it through props or reaching onto `globalThis`.
let loader: ReturnType<typeof vi.fn>;

function Probe({ pollMs = POLL_MS }: { pollMs?: number }) {
  const resource = useChainResource(() => loader(), { pollMs });
  return (
    <div>
      <span data-testid="errors">{resource.error ?? 'none'}</span>
      <span data-testid="updated">{resource.updatedAt ? 'yes' : 'no'}</span>
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