import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Boxes, Layers } from 'lucide-react';
import { Breadcrumb, Button, Card, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { HashDisplay } from '../components/HashDisplay';
import { InfoRow } from '../components/InfoRow';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getExplorerBlockByHeight,
  getExplorerHealth,
  type ExplorerBlockView,
  type ExplorerTransactionView,
} from '../services/explorerService';

export default function ExplorerBlockDetailPage() {
  const { height: heightParam } = useParams<{ height: string }>();
  const navigate = useNavigate();
  const height = Number(heightParam);
  const mode = getDataSourceMode();
  const [block, setBlock] = useState<ExplorerBlockView | null>(null);
  const [transactions, setTransactions] = useState<ExplorerTransactionView[]>([]);
  const [latestBlockHeight, setLatestBlockHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validHeight = Number.isInteger(height) && height > 0;

  useEffect(() => {
    let active = true;
    if (!validHeight) {
      setError('Invalid block height.');
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getExplorerBlockByHeight(height),
      getExplorerHealth().catch(() => ({ height: null })),
    ])
      .then(([blockData, health]) => {
        if (!active) return;
        setBlock(blockData);
        setTransactions(
          blockData.transactions.map((tx) => ({
            id: tx.id,
            type: tx.type,
            timestamp: tx.timestamp,
            sender: tx.sender,
            nonce: tx.nonce,
            blockHeight: blockData.height,
            protocolVersion: tx.protocolVersion,
          })),
        );
        setLatestBlockHeight(health.height ?? blockData.height);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load block.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [height, validHeight, mode]);

  if (!validHeight) {
    return (
      <ExplorerLayout>
        <ErrorState
          title="Invalid block height"
          description="The block identifier must be a numeric height."
          onRetry={() => navigate('/explorer/blocks')}
          retryLabel="Back to blocks"
        />
      </ExplorerLayout>
    );
  }

  const isLatestKnown = latestBlockHeight !== null && height >= latestBlockHeight;

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Block breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            { label: 'Blocks', href: '/explorer/blocks' },
            { label: `Block ${height}`, active: true },
          ]}
        />

        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/explorer/blocks')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Blocks
          </Button>
          <div className="flex items-center gap-2">
            <DataSourceBadge mode={mode} />
            {height > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/explorer/blocks/${height - 1}`)}
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Previous
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isLatestKnown || loading}
              onClick={() => navigate(`/explorer/blocks/${height + 1}`)}
            >
              Next
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <Boxes aria-hidden="true" className="h-6 w-6 text-securex-600" />
            Block {loading ? '…' : height}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? 'Loading block details…'
              : block
                ? formatDate(block.timestamp, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Block not found'}
          </p>
        </div>

        {error || !block ? (
          <ErrorState
            title="Block not found"
            description={error ?? `No block found at height ${height}.`}
            onRetry={() => navigate('/explorer/blocks')}
            retryLabel="Back to blocks"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card
              title="Block Information"
              className="lg:col-span-1"
              bodyClassName="p-0"
            >
              <dl className="divide-y divide-slate-100 px-5">
                <InfoRow label="Height" value={block.height} />
                <InfoRow
                  label="Hash"
                  value={
                    <HashDisplay value={block.hash} startChars={16} endChars={12} />
                  }
                />
                <InfoRow
                  label="Previous Hash"
                  value={
                    <HashDisplay
                      value={block.previousHash}
                      startChars={14}
                      endChars={10}
                    />
                  }
                />
                <InfoRow
                  label="Merkle Root"
                  value={
                    <HashDisplay
                      value={block.merkleRoot}
                      startChars={14}
                      endChars={10}
                    />
                  }
                />
                <InfoRow label="Timestamp" value={formatDate(block.timestamp)} />
                <InfoRow
                  label="Proposer"
                  value={<span className="break-all font-mono text-xs">{block.proposerId}</span>}
                />
                <InfoRow label="Transactions" value={block.transactions.length} />
                <InfoRow label="Version" value={`v${block.version}`} />
              </dl>
            </Card>

            <Card
              title="Transactions in this Block"
              className="lg:col-span-2"
              padding="none"
            >
              {loading ? (
                <div className="space-y-2 p-6">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Layers aria-hidden="true" className="h-6 w-6" />}
                  title="No transactions in this block"
                  description="This block contains no transaction records."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Sender</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          onClick={() => navigate(`/explorer/transactions/${tx.id}`)}
                          className="cursor-pointer transition-colors hover:bg-slate-50"
                        >
                          <td className="px-4 py-3.5">
                            <HashDisplay
                              value={tx.id}
                              startChars={12}
                              endChars={8}
                              className="text-securex-700"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {tx.type.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3.5 break-all font-mono text-xs text-slate-500">
                            {tx.sender}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Layers aria-hidden="true" className="h-4 w-4" />
          {mode === 'DEMO'
            ? 'Demo data for illustration purposes.'
            : 'Live block data from the SecureX Blockchain V2 node.'}
        </div>
      </div>
    </ExplorerLayout>
  );
}