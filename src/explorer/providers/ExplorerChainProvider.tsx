import { useMemo, type ReactNode } from 'react';
import { useChainResource } from '../hooks/useChainResource';
import {
  getChainSummary,
  toNetworkStatus,
  type ChainSummary,
} from '../services/chainApi';
import {
  CHAIN_POLL_INTERVAL_MS,
  ExplorerChainContext,
  type ExplorerChainContextValue,
} from './chainContext';

/**
 * Owns the single shared chain summary used by the header status pill and the
 * Network page.
 *
 * Centralising it means one polling loop serves the whole page instead of each
 * page and the shell fetching the same endpoints on their own timers, which
 * matters because the upstream services are free-tier and suspend when idle.
 */
export function ExplorerChainProvider({ children }: { children: ReactNode }) {
  const resource = useChainResource<ChainSummary>(() => getChainSummary(), {
    pollMs: CHAIN_POLL_INTERVAL_MS,
  });

  const value = useMemo<ExplorerChainContextValue>(
    () => ({
      ...resource,
      status:
        resource.data && resource.data.network
          ? toNetworkStatus(resource.data.network, resource.data.metrics)
          : null,
    }),
    [resource],
  );

  return (
    <ExplorerChainContext.Provider value={value}>
      {children}
    </ExplorerChainContext.Provider>
  );
}
