import { useCallback, useEffect, useRef, useState } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
}

export function useApi<T>(apiFn: () => Promise<T>): UseApiResult<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const apiFnRef = useRef(apiFn);
  apiFnRef.current = apiFn;

  const run = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiFnRef.current();
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setState({ data: null, loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
