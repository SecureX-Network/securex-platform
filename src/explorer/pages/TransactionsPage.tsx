import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Waypoints } from 'lucide-react';
import { useChainResource } from '../hooks/useChainResource';
import {
  getRecentTransactions,
  type ExplorerTransactionView,
} from '../services/chainApi';
import { formatChainTime, formatCount, humanizeToken, explorerRoutes } from '../utils/format';
import { PageHeader } from '../components/ExplorerWidgets';
import {
  Badge,
  Card,
  CopyButton,
  EmptyState,
  ErrorPanel,
  ExplorerButton,
  HashText,
  RefreshButton,
  StaleDataNotice,
  TableShell,
  TableRow,
  TableSkeleton,
  Td,
  Th,
} from '../components/primitives';

const PAGE_SIZE = 12;

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const resource = useChainResource<{
    transactions: ExplorerTransactionView[];
    hasMore: boolean;
  }>(() => getRecentTransactions(page, PAGE_SIZE), { deps: [page] });

  const transactions = resource.data?.transactions ?? [];
  const hasMore = resource.data?.hasMore ?? false;
  const from = transactions.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = (page - 1) * PAGE_SIZE + transactions.length;

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Transactions recorded inside committed blocks, newest first. The chain exposes no standalone transaction list, so this view is compiled from real block data."
        crumbs={[{ label: 'Explorer', to: explorerRoutes.overview }, { label: 'Transactions' }]}
        action={
          <RefreshButton onClick={resource.reload} refreshing={resource.refreshing} />
        }
      />

      {resource.error && !resource.loading && (
        <div className="mb-5">
          <Card padded={false}>
            <ErrorPanel
              message={`${resource.error} Transactions could not be read from the chain.`}
              onRetry={resource.reload}
              retrying={resource.refreshing}
            />
          </Card>
        </div>
      )}

      {resource.error && transactions.length > 0 && (
        <div className="mb-5">
          <StaleDataNotice message="The latest refresh failed." onRetry={resource.reload} />
        </div>
      )}

      <Card padded={false}>
        {resource.loading ? (
          <div className="p-5">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Waypoints aria-hidden="true" className="h-6 w-6" />}
            title="No transactions have been recorded yet"
            description="The network is operational, but no transactions have been committed yet. The SecureX chain currently sits at genesis with an empty transaction history. Search by transaction ID to inspect a specific record."
            action={
              page > 1 ? (
                <ExplorerButton onClick={() => setPage(1)}>Back to first page</ExplorerButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <TableShell minWidth="min-w-[900px]">
              <thead>
                <tr>
                  <Th>Transaction ID</Th>
                  <Th>Block</Th>
                  <Th>Type</Th>
                  <Th>Sender</Th>
                  <Th>Time (UTC)</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    onClick={() => navigate(explorerRoutes.transaction(tx.id))}
                  >
                    <Td>
                      <span className="inline-flex items-center gap-2">
                        <HashText value={tx.id} start={12} end={8} />
                        <CopyButton value={tx.id} label="transaction id" />
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(explorerRoutes.block(tx.blockHeight));
                        }}
                        className="font-medium tabular-nums text-explorer-accent hover:underline"
                      >
                        #{formatCount(tx.blockHeight)}
                      </button>
                    </Td>
                    <Td>
                      <Badge tone="info">{humanizeToken(tx.type)}</Badge>
                    </Td>
                    <Td>
                      <HashText value={tx.sender} start={8} end={6} />
                    </Td>
                    <Td className="whitespace-nowrap">{formatChainTime(tx.timestamp)}</Td>
                  </TableRow>
                ))}
              </tbody>
            </TableShell>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-explorer-border px-5 py-4">
              <p className="text-xs text-explorer-faint">
                Showing {from}–{to}
                {hasMore && ' (more available)'}
              </p>
              <div className="flex items-center gap-2">
                <ExplorerButton
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                  Previous
                </ExplorerButton>
                <span className="text-xs tabular-nums text-explorer-subtext">Page {page}</span>
                <ExplorerButton onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>
                  Next
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                </ExplorerButton>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
