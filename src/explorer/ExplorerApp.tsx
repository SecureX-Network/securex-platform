import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ExplorerShell } from './components/ExplorerShell';
import { ExplorerChainProvider } from './providers/ExplorerChainProvider';
import { LoadingPanel } from './components/primitives';
import { explorerRoutes } from './utils/format';

// The overview is the landing surface, so it is in the main chunk. The rest are
// split so the first paint of a public landing page is not paying for every
// detail view.
import OverviewPage from './pages/OverviewPage';

const BlocksPage = lazy(() => import('./pages/BlocksPage'));
const BlockDetailPage = lazy(() => import('./pages/BlockDetailPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const TransactionDetailPage = lazy(() => import('./pages/TransactionDetailPage'));
const ValidatorsPage = lazy(() => import('./pages/ValidatorsPage'));
const ValidatorDetailPage = lazy(() => import('./pages/ValidatorDetailPage'));
const NetworkPage = lazy(() => import('./pages/NetworkPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/**
 * The Explorer's public route tree.
 *
 * This is a separate bundle from the SecureX application, so these routes are
 * the ONLY routes on explorer-securex.sp-net.in. They are all read-only chain
 * views: there is no login, no account, no issuance, no revocation and no
 * administration anywhere in this tree.
 */
export default function ExplorerApp() {
  return (
    <ExplorerChainProvider>
      <ExplorerShell>
        <Suspense fallback={<LoadingPanel label="Loading" />}>
          <Routes>
            <Route path={explorerRoutes.overview} element={<OverviewPage />} />
            <Route path="/blocks" element={<BlocksPage />} />
            <Route path="/blocks/:height" element={<BlockDetailPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/:hash" element={<TransactionDetailPage />} />
            <Route path="/validators" element={<ValidatorsPage />} />
            <Route path="/validators/:id" element={<ValidatorDetailPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ExplorerShell>
    </ExplorerChainProvider>
  );
}
