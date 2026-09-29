import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, Waypoints } from 'lucide-react';
import { useChainResource } from '../hooks/useChainResource';
import {
  getTransactionById,
  type ExplorerTransactionView,
} from '../services/chainApi';
import {
  formatChainTime,
  formatCount,
  formatRelativeTime,
  humanizeToken,
  explorerRoutes,
} from '../utils/format';
import { PageHeader, RawJsonPanel } from '../components/ExplorerWidgets';
import {
  Badge,
  Card,
  CardHeader,
  CopyButton,
  EmptyState,
  ErrorPanel,
  HashText,
  KeyValue,
  LoadingPanel,
  RefreshButton,
} from '../components/primitives';

export default function TransactionDetailPage() {
  const { hash } = useParams<{ hash: string }>();
  const id = hash ?? '';

  const resource = useChainResource<ExplorerTransactionView>(
    () => getTransactionById(id),
    { enabled: id.length > 0, deps: [id] },
  );

  const tx = resource.data;

  return (
    <>
      <PageHeader
        title="Transaction"
        subtitle={
          tx
            ? `Recorded ${formatChainTime(tx.timestamp)} · ${formatRelativeTime(tx.timestamp)}`
            : 'Reading this transaction from the SecureX chain.'
        }
        crumbs={[
          { label: 'Explorer', to: explorerRoutes.overview },
          { label: 'Transactions', to: explorerRoutes.transactions },
          { label: tx ? truncateForCrumb(tx.id) : 'Detail' },
        ]}
        action={<RefreshButton onClick={resource.reload} refreshing={resource.refreshing} />}
      />

      {resource.notFound && (
        <Card padded={false}>
          <EmptyState
            icon={<Waypoints aria-hidden="true" className="h-6 w-6" />}
            title="Transaction not found"
            description={`The SecureX chain has no transaction with the ID "${id}". If it has not been committed yet, or the ID is incorrect, it cannot be shown.`}
            action={
              <Link
                to={explorerRoutes.transactions}
                className="text-sm font-medium text-explorer-accent hover:text-blue-300"
              >
                Browse all transactions
              </Link>
            }
          />
        </Card>
      )}

      {resource.error && !resource.notFound && (
        <Card padded={false}>
          <ErrorPanel
            message={`${resource.error} This transaction could not be read from the chain.`}
            onRetry={resource.reload}
            retrying={resource.refreshing}
          />
        </Card>
      )}

      {resource.loading && !tx && (
        <Card>
          <LoadingPanel label="Loading transaction" />
        </Card>
      )}

      {tx && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardHeader
                icon={<Waypoints aria-hidden="true" className="h-4 w-4" />}
                title="Transaction Overview"
                action={<Badge tone="info">{humanizeToken(tx.type)}</Badge>}
              />
              <dl>
                <KeyValue label="Transaction ID" mono>
                  <span className="inline-flex items-start gap-2">
                    <HashText value={tx.id} truncate={false} className="break-all" />
                    <CopyButton value={tx.id} label="transaction id" />
                  </span>
                </KeyValue>
                <KeyValue label="Type">{humanizeToken(tx.type)}</KeyValue>
                <KeyValue label="Timestamp (UTC)">{formatChainTime(tx.timestamp)}</KeyValue>
                <KeyValue label="Relative">{formatRelativeTime(tx.timestamp)}</KeyValue>
                <KeyValue label="Sender" mono>
                  <span className="inline-flex items-center gap-2">
                    <HashText value={tx.sender} start={16} end={10} />
                    <CopyButton value={tx.sender} label="sender" />
                  </span>
                </KeyValue>
                <KeyValue label="Nonce">{formatCount(tx.nonce)}</KeyValue>
                <KeyValue label="Protocol">{tx.protocolVersion}</KeyValue>
              </dl>
            </Card>

            <Card>
              <CardHeader
                title="Included in"
                description="The block that committed this transaction."
              />
              <Link
                to={explorerRoutes.block(tx.blockHeight)}
                className="flex items-center justify-between rounded-xl border border-explorer-border bg-explorer-bg/60 px-4 py-3.5 transition-colors hover:border-explorer-accent"
              >
                <span className="text-sm text-explorer-subtext">
                  Block{' '}
                  <span className="font-semibold tabular-nums text-explorer-text">
                    #{formatCount(tx.blockHeight)}
                  </span>
                </span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-explorer-faint" />
              </Link>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Related" />
              <div className="space-y-2.5">
                <Link
                  to={explorerRoutes.transactions}
                  className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                >
                  <span className="text-explorer-subtext">All transactions</span>
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-explorer-faint" />
                </Link>
                <Link
                  to={explorerRoutes.network}
                  className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                >
                  <span className="text-explorer-subtext">Network status</span>
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-explorer-faint" />
                </Link>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Raw transaction"
                description="The exact record returned by the chain."
              />
              <RawJsonPanel
                data={{
                  id: tx.id,
                  type: tx.type,
                  timestamp: tx.timestamp,
                  sender: tx.sender,
                  nonce: tx.nonce,
                  blockHeight: tx.blockHeight,
                  protocolVersion: tx.protocolVersion,
                }}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function truncateForCrumb(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}
