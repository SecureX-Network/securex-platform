import { createContext, useContext } from 'react';
import type { ChainResource } from '../hooks/useChainResource';
import type { ChainSummary, ExplorerNetworkStatus } from '../services/chainApi';
import { deriveConnection, type ChainConnection } from './chainConnection';

/**
 * Network health is polled on a deliberately long interval.
 *
 * Both the Platform API and the blockchain node run on Render's free plan and
 * suspend when idle. The Explorer is public, so every open tab is a real load
 * on those services; 45s keeps the header honest without turning a free-tier
 * node into a polling target. Polling also pauses while the tab is hidden, and
 * the manual Refresh button in the header is always available regardless.
 */
export const CHAIN_POLL_INTERVAL_MS = 45_000;

export interface ExplorerChainContextValue extends ChainResource<ChainSummary> {
  /** Convenience projection for the header / network card. Null while loading. */
  status: ExplorerNetworkStatus | null;
  /**
   * The honest four-state view of the connection, derived purely from the
   * resource's own outcomes. `operational` is reachable only after a real
   * health request succeeded — see `deriveConnection`.
   */
  connection: ChainConnection;
}

export const ExplorerChainContext = createContext<ExplorerChainContextValue | null>(null);

/**
 * The shared chain summary. Falls back to an inert value so a component can
 * never crash outside the provider — it simply renders its loading state.
 */
export function useExplorerChain(): ExplorerChainContextValue {
  return (
    useContext(ExplorerChainContext) ?? {
      data: null,
      status: null,
      error: null,
      loading: true,
      refreshing: false,
      notFound: false,
      updatedAt: null,
      attemptsMade: 0,
      transient: false,
      exhausted: false,
      inFlightMs: 0,
      reload: () => {},
      connection: deriveConnection({
        everSucceeded: false,
        inFlight: true,
        error: null,
        transient: false,
        attemptsMade: 0,
        exhausted: false,
        nodeStatus: null,
      }),
    }
  );
}
