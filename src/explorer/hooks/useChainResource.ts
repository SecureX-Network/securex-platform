import { useCallback, useEffect, useRef, useState } from 'react';
import { NotFoundError } from '../services/chainApi';

export interface ChainResource<T> {
  data: T | null;
  /** Human-readable reason the last attempt failed, or null. */
  error: string | null;
  /** True only for the first load of a new target, when there is nothing to show. */
  loading: boolean;
  /** True while re-fetching a target whose data is already on screen. */
  refreshing: boolean;
  /** The lookup was answered definitively: it does not exist. */
  notFound: boolean;
  /** When `data` was last successfully fetched. */
  updatedAt: Date | null;
  /** Manual refresh. Always available, regardless of whether polling is on. */
  reload: () => void;
}

export interface UseChainResourceOptions {
  /**
   * Automatic refresh interval in ms. Omit (or pass 0) to disable polling and
   * load exactly once.
   *
   * Deliberately conservative: the Platform API and the blockchain node run on
   * Render's free plan and a public explorer can have many visitors at once.
   * Polling also pauses entirely while the tab is hidden.
   */
  pollMs?: number;
  /** Re-runs the loader when any of these change (e.g. a route param). */
  deps?: ReadonlyArray<unknown>;
  /** When false the resource is not fetched at all (e.g. no id in the route). */
  enabled?: boolean;
}

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
  const { pollMs = 0, deps = [], enabled = true } = options;

  // A stable key for the dependency list. Spreading a variable-length array into
  // a useEffect dependency list is fragile, so the values are serialised instead.
  const depsKey = JSON.stringify(deps);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

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
      } catch (caught) {
        if (!mountedRef.current || requestIdRef.current !== requestId) return;
        if (caught instanceof NotFoundError) {
          hasDataRef.current = false;
          setNotFound(true);
          setData(null);
        } else {
          setError(
            caught instanceof Error
              ? caught.message
              : 'The blockchain service could not be reached.',
          );
        }
      } finally {
        if (mountedRef.current && requestIdRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled],
  );

  // Initial load, and a reload whenever the route inputs change.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void run(true);
  }, [enabled, depsKey, run]);

  // Conservative polling, paused while the tab is hidden.
  useEffect(() => {
    if (!enabled || pollMs <= 0) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void run(false);
    };

    const timer = window.setInterval(tick, pollMs);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, pollMs, run]);

  return {
    data,
    error,
    loading,
    refreshing,
    notFound,
    updatedAt,
    reload: () => {
      void run(false);
    },
  };
}
