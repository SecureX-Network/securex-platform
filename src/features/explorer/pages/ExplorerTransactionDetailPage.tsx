import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowRightLeft, Hash, IdCard } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { ErrorState } from '@/components/ui';
import { getTransactionById } from '@/services/api/blockchainService';
import type { BlockchainTransaction } from '@/types';
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

export default function ExplorerTransactionDetailPage() {
  const { txId } = useParams<{ txId: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<BlockchainTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!txId) {
      setError('Missing transaction ID.');
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(null);
    getTransactionById(txId)
      .then((data) => {
        if (active) setTransaction(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load transaction.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [txId]);

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/explorer/transactions')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Transactions
          </Button>
        </div>

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <ArrowRightLeft aria-hidden="true" className="h-6 w-6 text-securex-600" />
            Transaction Details
          </h1>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">
            {transaction ? transaction.id : 'Loading transaction…'}
          </p>
        </div>

        {!loading && (error || !transaction) ? (
          <ErrorState
            title="Transaction not found"
            description={error ?? 'No transaction found with this ID.'}
            onRetry={() => navigate('/explorer/transactions')}
            retryLabel="Back to transactions"
          />
        ) : transaction ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Transaction Information" bodyClassName="p-0">
              <dl className="divide-y divide-slate-100 px-5">
                <InfoRow label="ID" value={truncateHash(transaction.id, 14, 10)} />
                <InfoRow
                  label="Block Height"
                  value={
                    <a
                      href={`/explorer/blocks/${transaction.blockHeight}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/explorer/blocks/${transaction.blockHeight}`);
                      }}
                      className="inline-flex items-center gap-1.5 text-securex-700 hover:underline"
                    >
                      <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                      #{transaction.blockHeight}
                      <ArrowRight aria-hidden="true" className="h-3 w-3" />
                    </a>
                  }
                />
                <InfoRow
                  label="Type"
                  value={transaction.type.replace(/_/g, ' ')}
                />
                <InfoRow
                  label="Status"
                  value={
                    transaction.status === 'CONFIRMED' ? (
                      <Badge variant="success">Confirmed</Badge>
                    ) : transaction.status === 'PENDING' ? (
                      <Badge variant="warning">Pending</Badge>
                    ) : (
                      <Badge variant="danger">Failed</Badge>
                    )
                  }
                />
                <InfoRow
                  label="Timestamp"
                  value={formatDate(transaction.timestamp, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                />
                <InfoRow label="Confirmations" value={transaction.confirmations} />
                {transaction.gasUsed !== undefined && (
                  <InfoRow label="Gas Used" value={transaction.gasUsed.toLocaleString()} />
                )}
              </dl>
            </Card>

            <div className="space-y-6">
              <Card title="Parties" bodyClassName="p-0">
                <dl className="divide-y divide-slate-100 px-5">
                  <InfoRow
                    label="From"
                    value={<span className="break-all font-mono text-xs">{transaction.from}</span>}
                  />
                  <InfoRow
                    label="To"
                    value={<span className="break-all font-mono text-xs">{transaction.to}</span>}
                  />
                </dl>
              </Card>

              {transaction.credentialId && (
                <Card title="Credential" bodyClassName="p-0">
                  <dl className="divide-y divide-slate-100 px-5">
                    <InfoRow
                      label="Credential ID"
                      value={
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
                          <IdCard aria-hidden="true" className="h-3.5 w-3.5 text-securex-600" />
                          {transaction.credentialId}
                        </span>
                      }
                    />
                  </dl>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-securex-600 border-t-transparent" />
              Loading transaction…
            </div>
          </Card>
        )}
      </div>
    </ExplorerLayout>
  );
}