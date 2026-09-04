import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowRightLeft, Hash } from 'lucide-react';
import { Breadcrumb, Button, Card, ErrorState, Spinner } from '@/components/ui';
import { formatDate } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { HashDisplay } from '../components/HashDisplay';
import { InfoRow } from '../components/InfoRow';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getExplorerTransactionById,
  type ExplorerTransactionView,
} from '../services/explorerService';

export default function ExplorerTransactionDetailPage() {
  const { txId } = useParams<{ txId: string }>();
  const navigate = useNavigate();
  const mode = getDataSourceMode();
  const [transaction, setTransaction] = useState<ExplorerTransactionView | null>(null);
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
    getExplorerTransactionById(txId)
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
  }, [txId, mode]);

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Transaction breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            { label: 'Transactions', href: '/explorer/transactions' },
            { label: 'Transaction Details', active: true },
          ]}
        />

        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/explorer/transactions')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Transactions
          </Button>
          <DataSourceBadge mode={mode} />
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

        {loading ? (
          <Card>
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Spinner size="sm" />
              Loading transaction…
            </div>
          </Card>
        ) : error || !transaction ? (
          <ErrorState
            title="Transaction not found"
            description={error ?? 'No transaction found with this ID.'}
            onRetry={() => navigate('/explorer/transactions')}
            retryLabel="Back to transactions"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Transaction Information" bodyClassName="p-0">
              <dl className="divide-y divide-slate-100 px-5">
                <InfoRow
                  label="ID"
                  value={
                    <HashDisplay value={transaction.id} startChars={14} endChars={10} />
                  }
                />
                {transaction.blockHeight > 0 && (
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
                )}
                <InfoRow
                  label="Type"
                  value={transaction.type.replace(/_/g, ' ')}
                />
                <InfoRow
                  label="Protocol"
                  value={<span className="text-sm text-slate-700">{transaction.protocolVersion}</span>}
                />
                <InfoRow
                  label="Nonce"
                  value={transaction.nonce}
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
              </dl>
            </Card>

            <Card title="Sender" bodyClassName="p-0">
              <dl className="divide-y divide-slate-100 px-5">
                <InfoRow
                  label="From"
                  value={
                    <span className="break-all font-mono text-xs">
                      <HashDisplay value={transaction.sender} fullDisplay />
                    </span>
                  }
                />
              </dl>
            </Card>
          </div>
        )}

        {mode === 'DEMO' && (
          <p className="text-xs text-slate-400">Showing demo transaction data.</p>
        )}
      </div>
    </ExplorerLayout>
  );
}