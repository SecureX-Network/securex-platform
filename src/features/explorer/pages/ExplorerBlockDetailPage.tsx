import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Boxes, FileCheck, Hash, Layers } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { ErrorState } from '@/components/ui';
import { getBlockByHeight, getTransactions } from '@/services/api/blockchainService';
import type { BlockchainBlock, BlockchainTransaction } from '@/types';
import { formatDate, truncateHash } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function ExplorerBlockDetailPage() {
  const { blockHash } = useParams<{ blockHash: string }>();
  const navigate = useNavigate();
  const height = Number(blockHash);
  const [block, setBlock] = useState<BlockchainBlock | null>(null);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
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
    Promise.all([getBlockByHeight(height), getTransactions(1)])
      .then(([blockData, txsRes]) => {
        if (!active) return;
        setBlock(blockData);
        setTransactions(
          txsRes.data.filter((tx) => tx.blockHeight === height).slice(0, 20),
        );
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
  }, [height, validHeight]);

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

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/explorer/blocks')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Blocks
          </Button>
          <div className="flex items-center gap-2">
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
                <InfoRow
                  label="Height"
                  value={
                    <span className="inline-flex items-center gap-1.5 text-securex-700">
                      <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                      {block.height}
                    </span>
                  }
                />
                <InfoRow label="Hash" value={truncateHash(block.hash, 16, 12)} />
                <InfoRow
                  label="Previous Hash"
                  value={truncateHash(block.previousHash, 14, 10)}
                />
                <InfoRow
                  label="Merkle Root"
                  value={truncateHash(block.merkleRoot, 14, 10)}
                />
                <InfoRow label="Timestamp" value={formatDate(block.timestamp)} />
                <InfoRow label="Validator" value={<span className="text-xs">{block.validator}</span>} />
                <InfoRow label="Transactions" value={block.transactionCount} />
                <InfoRow label="Size" value={`${(block.size / 1000).toFixed(1)} KB`} />
              </dl>
            </Card>

            <Card
              title="Transactions in this Block"
              className="lg:col-span-2"
              padding="none"
              footer={
                transactions.length > 12 ? (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/explorer/transactions')}
                    >
                      View all transactions
                    </Button>
                  </div>
                ) : undefined
              }
            >
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-slate-400">
                  <FileCheck aria-hidden="true" className="h-10 w-10" />
                  <p className="text-sm font-medium">No transactions in this block</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          onClick={() => navigate(`/explorer/transactions/${tx.id}`)}
                          className="cursor-pointer transition-colors hover:bg-slate-50"
                        >
                          <td className="px-4 py-3.5 font-mono text-xs text-securex-700">
                            {truncateHash(tx.id, 12, 8)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {tx.type.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              size="sm"
                              variant={
                                tx.status === 'CONFIRMED'
                                  ? 'success'
                                  : tx.status === 'PENDING'
                                    ? 'warning'
                                    : 'danger'
                              }
                            >
                              {tx.status === 'CONFIRMED'
                                ? 'Confirmed'
                                : tx.status === 'PENDING'
                                  ? 'Pending'
                                  : 'Failed'}
                            </Badge>
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
          Demo data for illustration purposes.
        </div>
      </div>
    </ExplorerLayout>
  );
}