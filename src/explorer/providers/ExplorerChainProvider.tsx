import { useMemo, type ReactNode } from 'react';
import { useChainResource, DEFAULT_RECOVERY } from '../hooks/useChainResource';
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
import { deriveConnection } from './chainConnection';

/**
 * Bounded recovery ladder for a node that sleeps.
 *
 * The ordinary 45s poll backoff would double from 45s to 90s to 180s and keep
 * going, which against a ~22s cold start means the Explorer keeps showing a
 * broken-looking page long after the node is back. `DEFAULT_RECOVERY` retries
 * transient failures at 2s / 4s / 8s / 15s / 30s and then stops, reporting
 * honestly and waiting for the visitor to press Retry.
 *
 * Opted into here, and only here: the chain summary is the resource whose
 * upstream suspends. Block and transaction detail lookups keep the plain
 * poll-and-back-off behaviour.
 */
const CHAIN_RECOVERY = DEFAULT_RECOVERY;

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
    recovery: CHAIN_RECOVERY,
  });

  const value = useMemo<ExplorerChainContextValue>(() => {
    const status =
      resource.data && resource.data.network
        ? toNetworkStatus(resource.data.network, resource.data.metrics)
        : null;

    return {
      ...resource,
      status,
      connection: deriveConnection({
        everSucceeded: resource.updatedAt !== null,
        inFlight: resource.loading || resource.refreshing,
        error: resource.error,
        transient: resource.transient,
        attemptsMade: resource.attemptsMade,
        exhausted: resource.exhausted,
        nodeStatus: resource.data?.health?.status ?? null,
        inFlightMs: resource.inFlightMs,
      }),
    };
  }, [resource]);

  return (
    <ExplorerChainContext.Provider value={value}>
      {children}
    </ExplorerChainContext.Provider>
  );
}
