import { useCallback, useEffect, useRef, useState } from 'react';
import { NotFoundError, isTransientChainError } from '../services/chainApi';

export interface ChainResource<T> {
  data: T | null;
  /** Human-readable reason the last attempt failed, or null. */
  error: string | null;
  /** True only for the first load of a new target, when there is nothing to show. */
  loading: boolean;
  /** True while re-fetching a target whose data is already on screen. */
  refreshing: boolean;
  /**
   * True while any attempt is in flight.
   *
   * Distinct from `loading` / `refreshing` on purpose. A *retry* that runs
   * before the first success has no data on screen, so it sets neither of those
   * and would otherwise read as idle — dropping the UI back to "Connecting" for
   * the whole attempt, right after it had correctly said the node was asleep.
   */
  inFlight: boolean;
  /** The lookup was answered definitively: it does not exist. */
  notFound: boolean;
  /** When `data` was last successfully fetched. */
  updatedAt: Date | null;
  /** Consecutive failed attempts in the current budget. */
  attemptsMade: number;
  /**
   * Is the last failure the node being asleep rather than a real fault?
   * A sleeping node is worth retrying quickly; a real fault is not.
   */
  transient: boolean;
  /**
   * Has the bounded retry budget been spent? Only true for transient failures —
   * a genuine fault is reported immediately and never burns a retry budget.
   */
  exhausted: boolean;
  /**
   * How long the outstanding attempt has been waiting, in ms; 0 when idle.
   *
   * Only populated for a resource with a `recovery` profile. One request has to
   * outlast the API's own retry budget before it can be called a failure, and
   * until then the UI would otherwise have nothing to report for well over a
   * minute. Elapsed time is real evidence rather than an assumption, so it
   * gives the UI something honest to say in the meantime.
   */
  inFlightMs: number;
  /** Manual refresh. Always available, and always resets the retry budget. */
  reload: () => void;
}

/**
 * Bounded recovery for a resource whose upstream sleeps.
 *
 * The ordinary poll backoff is right for steady state and wrong for recovery: it
 * starts at the full poll interval (45s for the chain summary) and doubles from
 * there, reaching fifteen minutes. Against a node that cold-starts in about
 * twenty seconds, that means a visitor sits on a stale or broken-looking page
 * long after the node is back — the recovery looks like an outage that never
 * ends.
 *
 * This profile retries transient failures on a short, bounded ladder instead,
 * and then *stops*. Stopping is the important half: a retry loop with no ceiling
 * is just a way of keeping a struggling free-tier instance down, and it would
 * also keep the Explorer claiming to be trying after it has stopped being able
 * to do anything useful. Once the budget is spent the UI reports the failure
 * honestly and waits for the visitor to ask again.
 */
export interface ChainRecoveryProfile {
  /** Attempts before giving up on a transient failure. */
  maxAttempts: number;
  /** First recovery retry delay. */
  baseDelayMs: number;
  /** Ceiling for the recovery backoff. */
  maxDelayMs: number;
}

export interface UseChainResourceOptions {
  /**
   * Automatic refresh interval in ms. Omit (or pass 0) to disable polling and
   * load exactly once.
   *
   * Deliberately conservative: the Platform API and the blockchain node run on
   * Render's free plan and a public explorer can have many visitors at once.
   * Polling also pauses entirely while the tab is hidden, and backs off when
   * the upstream is failing (see `MAX_POLL_BACKOFF_MS`).
   */
  pollMs?: number;
  /** Re-runs the loader when any of these change (e.g. a route param). */
  deps?: ReadonlyArray<unknown>;
  /** When false the resource is not fetched at all (e.g. no id in the route). */
  enabled?: boolean;
  /**
   * Bounded fast recovery for transient (infrastructural) failures.
   *
   * Omit this and the resource keeps the plain poll-and-back-off behaviour,
   * which is correct for everything that does not sleep. Supply it for the
   * chain summary, whose upstream is a free-tier node that suspends when idle.
   */
  recovery?: ChainRecoveryProfile;
}

/**
 * Ceiling for the polling backoff after consecutive failures.
 *
 * A fixed interval is the wrong behaviour when the upstream is unhealthy. A
 * public explorer can have many tabs open at once, and if the node starts
 * rejecting requests (a rate limit, a suspended free instance, a restart), a
 * fixed interval means every tab keeps asking a service that is already
 * struggling — which can stop it from recovering. Successive failures therefore
 * double the wait, up to this ceiling; the first success resets the page to its
 * normal interval. The manual Refresh button is unaffected, and returning to a
 * hidden tab always refetches immediately rather than waiting out a backoff.
 */
const MAX_POLL_BACKOFF_MS = 15 * 60_000;

/**
 * Default recovery ladder for a resource that is explicitly known to sleep.
 *
 * Tuned against the measured cold start (~22s) rather than guessed. The first
 * three retries land inside that window at 2s / 4s / 8s, so a node that wakes
 * normally is picked up almost as soon as it answers, and the ladder then runs
 * out to 15s / 30s before finally reporting the failure rather than spinning
 * forever.
 *
 * Applied only where `recovery` is passed. Every other resource keeps the plain
 * poll-and-back-off behaviour, which is the right default for a lookup that
 * does not have a sleeping upstream — retrying a detail page on a 2s ladder
 * would be load for nothing.
 */
export const DEFAULT_RECOVERY: ChainRecoveryProfile = {
  maxAttempts: 5,
  baseDelayMs: 2000,
  maxDelayMs: 30_000,
};

/**
 * Loads a read-only chain resource and exposes the states a public explorer must
 * distinguish: loading, loaded, and failed.
 *
 * A refresh keeps the data already on screen instead of blanking the page, so a
 * routine poll never flashes a skeleton. A failure keeps the last good data and
 * shows the error beside it, so a transient hiccup does not destroy the
 * visitor's view — and it is never quietly replaced with anything invented.
 */
export function useChainResource<T>(
  loader: () => Promise<T>,
  options: UseChainResourceOptions = {},
): ChainResource<T> {
  const { pollMs = 0, deps = [], enabled = true, recovery } = options;

  // A stable key for the dependency list. Spreading a variable-length array into
  // a useEffect dependency list is fragile, so the values are serialised instead.
  const depsKey = JSON.stringify(deps);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [inFlight, setInFlight] = useState(enabled);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [attemptsMade, setAttemptsMade] = useState(0);
  const [transient, setTransient] = useState(false);
  const [inFlightMs, setInFlightMs] = useState(0);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // Consecutive failed attempts, used to slow the poll timer down and to drive
  // the bounded recovery ladder. A ref rather than state: the timer must not be
  // torn down and rescheduled on every state change, so the mirrors below exist
  // purely for rendering.
  const consecutiveFailuresRef = useRef(0);
  const transientRef = useRef(false);
  // Bumped whenever an attempt finishes, so the polling effect re-schedules on
  // the correct rung of the ladder immediately. Without this the timer would be
  // armed once at mount on the success rung and then keep firing at the plain
  // poll interval, which would leave a visitor who loads the page while the
  // node is asleep staring at "Waking" for a full poll interval before the first
  // recovery retry actually happened.
  const [scheduleNonce, setScheduleNonce] = useState(0);

  const resetBudget = useCallback(() => {
    consecutiveFailuresRef.current = 0;
    transientRef.current = false;
    setAttemptsMade(0);
    setTransient(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (fresh: boolean) => {
      if (!enabled) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setInFlight(true);
      if (fresh) {
        // A new target (route change / new page): show a skeleton.
        hasDataRef.current = false;
        setLoading(true);
      } else if (hasDataRef.current) {
        setRefreshing(true);
      }

      setError(null);
      setNotFound(false);

      try {
        const result = await loaderRef.current();
        if (!mountedRef.current || requestIdRef.current !== requestId) return;
        hasDataRef.current = true;
        setData(result);
        setNotFound(false);
        setUpdatedAt(new Date());
        resetBudget();
        // A success means the next poll should be a normal one, not the tail of
        // a recovery ladder.
        setScheduleNonce((n) => n + 1);
      } catch (caught) {
        if (!mountedRef.current || requestIdRef.current !== requestId) return;
        // A definitive "does not exist" is an answer, not a service failure, so
        // it does not count against the backoff.
        if (caught instanceof NotFoundError) {
          hasDataRef.current = false;
          setNotFound(true);
          setData(null);
          resetBudget();
        } else {
          consecutiveFailuresRef.current += 1;
          const isTransient = isTransientChainError(caught);
          transientRef.current = isTransient;
          setAttemptsMade(consecutiveFailuresRef.current);
          setTransient(isTransient);
          setError(
            caught instanceof Error
              ? caught.message
              : 'The blockchain service could not be reached.',
          );
          // Re-arm on the rung this failure earned, not the one the mount-time
          // timer happened to be armed with.
          setScheduleNonce((n) => n + 1);
        }
      } finally {
        if (mountedRef.current && requestIdRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          setInFlight(false);
        }
      }
    },
    [enabled, resetBudget],
  );

  // Initial load, and a reload whenever the route inputs change.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void run(true);
  }, [enabled, depsKey, run]);

  // A one-second heartbeat for the elapsed-time signal, alive only while a
  // request is outstanding and only for a resource that has a recovery profile.
  // A healthy read finishes in ~0.3s, so this almost never actually runs.
  useEffect(() => {
    const inFlight = loading || refreshing;
    if (!recovery || !inFlight) {
      setInFlightMs(0);
      return;
    }
    const startedAt = Date.now();
    setInFlightMs(0);
    const ticker = window.setInterval(() => {
      setInFlightMs(Date.now() - startedAt);
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [loading, refreshing, recovery]);

  // Conservative polling, paused while the tab is hidden, backed off while the
  // upstream is failing, and retried on a short bounded ladder when the upstream
  // is merely asleep.
  useEffect(() => {
    if (!enabled || pollMs <= 0) return;

    let timer = 0;
    // Set when the retry budget is spent and the timer has been retired on
    // purpose, so the visibility handler knows not to silently restart it.
    let parked = false;

    const schedule = () => {
      const failures = consecutiveFailuresRef.current;
      const spentBudget =
        recovery !== undefined &&
        transientRef.current &&
        failures >= recovery.maxAttempts;

      if (spentBudget) {
        // Deliberately stop. The ladder is over, and continuing to poll would
        // mean claiming to be trying after we have decided there is no point.
        // `reload()` restarts the budget when the visitor asks.
        parked = true;
        return;
      }

      let wait: number;
      if (recovery && transientRef.current && failures > 0) {
        // The node is asleep rather than broken: recover on the short ladder.
        wait = Math.min(recovery.baseDelayMs * 2 ** (failures - 1), recovery.maxDelayMs);
      } else if (failures === 0) {
        wait = pollMs;
      } else {
        // A genuine fault, or a resource with no recovery profile. Back off as
        // before.
        wait = Math.min(pollMs * 2 ** (failures - 1), MAX_POLL_BACKOFF_MS);
      }

      parked = false;
      timer = window.setTimeout(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          // Hidden tab: skip the request but keep the timer alive.
          schedule();
          return;
        }
        void run(false).finally(schedule);
      }, wait);
    };

    schedule();

    const onVisible = () => {
      if (document.hidden) return;
      window.clearTimeout(timer);
      if (parked) {
        // Budget spent while hidden: do not quietly restart. Re-entering the
        // visible state is not a decision to retry, and a dozen tabs all waking
        // the same cold node at once is exactly the load it cannot absorb.
        // The honest state stays put until the visitor presses Retry.
        return;
      }
      // A returning visitor should get current data at once, not after waiting
      // out a backoff window.
      void run(false).finally(schedule);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, pollMs, recovery, run, scheduleNonce]);

  // Exhaustion is derived, not stored: only a transient failure can exhaust the
  // budget, and it is spent exactly when the failure count reaches the ceiling.
  // A resource with no recovery profile can never exhaust one.
  const exhausted =
    recovery !== undefined && transient && attemptsMade >= recovery.maxAttempts;

  return {
    data,
    error,
    loading,
    refreshing,
    inFlight,
    notFound,
    updatedAt,
    attemptsMade,
    transient,
    exhausted,
    inFlightMs,
    reload: () => {
      // A manual reload is a request from the visitor to try again, so it starts
      // a fresh bounded cycle rather than inheriting an exhausted one.
      resetBudget();
      void run(false);
    },
  };
}
