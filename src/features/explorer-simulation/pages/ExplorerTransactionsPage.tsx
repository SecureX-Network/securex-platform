import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState, Pagination, Select, Table } from '@/components/ui';
import { formatDate } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { HashDisplay } from '../components/HashDisplay';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getRecentTransactions,
  type ExplorerTransactionView,
} from '../services/explorerService';

const PAGE_SIZE = 12;

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Issuer Registered', value: 'ISSUER_REGISTER' },
  { label: 'Credential Issued', value: 'CREDENTIAL_ISSUE' },
  { label: 'Credential Revoked', value: 'CREDENTIAL_REVOKE' },
  { label: 'Credential Suspended', value: 'CREDENTIAL_SUSPEND' },
  { label: 'Credential Reinstated', value: 'CREDENTIAL_REINSTATE' },
  { label: 'Credential Reissued', value: 'CREDENTIAL_REISSUE' },
  { label: 'Key Registered', value: 'KEY_REGISTER' },
  { label: 'Key Rotated', value: 'KEY_ROTATE' },
  { label: 'Batch Anchored', value: 'BATCH_ANCHOR' },
];

export default function ExplorerTransactionsPage() {
  const navigate = useNavigate();
  const mode = getDataSourceMode();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [transactions, setTransactions] = useState<ExplorerTransactionView[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getRecentTransactions(page, PAGE_SIZE)
      .then((res) => {
        if (!active) return;
        // Note: the SecureX Blockchain V2 API has no server-side transaction
        // filter endpoint, so type filtering is applied client-side over the
        // small recent set (honest for a small/demo-scale chain).
        const all = res.transactions;
        const filtered =
          typeFilter === 'all'
            ? all
            : all.filter((tx) => tx.type === typeFilter);
        setTransactions(filtered);
        setTotal(typeFilter === 'all' ? res.total : filtered.length);
        setTotalPages(
          typeFilter === 'all'
            ? Math.max(1, Math.ceil(res.total / PAGE_SIZE))
            : Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
        );
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load transactions.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, typeFilter, mode]);

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
              <RefreshCw aria-hidden="true" className="h-6 w-6 text-securex-600" />
              Transactions
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse recent credential and network transactions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full sm:w-56">
              <Select
                label="Type"
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
                options={TYPE_OPTIONS}
                aria-label="Filter transactions by type"
              />
            </div>
            <DataSourceBadge mode={mode} />
          </div>
        </div>

        {mode === 'DEMO' && (
          <p className="text-xs text-slate-400">
            Showing demo transaction data.
          </p>
        )}

        {error ? (
          <ErrorState
            title="Could not load transactions"
            description={error}
            onRetry={() => setPage(page)}
          />
        ) : (
          <>
            <Table<ExplorerTransactionView>
              columns={[
                {
                  key: 'id',
                  header: 'ID',
                  accessor: (tx) => (
                    <HashDisplay
                      value={tx.id}
                      startChars={12}
                      endChars={8}
                      className="text-securex-700"
                    />
                  ),
                },
                {
                  key: 'blockHeight',
                  header: 'Block',
                  align: 'right',
                  accessor: (tx) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/explorer/blocks/${tx.blockHeight}`);
                      }}
                      className="font-medium text-securex-700 hover:underline"
                    >
                      #{tx.blockHeight}
                    </button>
                  ),
                },
                { key: 'type', header: 'Type', accessor: (tx) => tx.type.replace(/_/g, ' ') },
                { key: 'sender', header: 'Sender', accessor: (tx) => shorten(senderLabel(tx)) },
                {
                  key: 'timestamp',
                  header: 'Timestamp',
                  sortable: true,
                  sortValue: (tx) => tx.timestamp,
                  accessor: (tx) => (
                    <span className="text-sm text-slate-500">
                      {formatDate(tx.timestamp, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  ),
                },
                {
                  key: 'protocolVersion',
                  header: 'Protocol',
                  accessor: (tx) => <span className="text-xs text-slate-500">{tx.protocolVersion}</span>,
                },
              ]}
              data={transactions}
              rowKey={(tx) => tx.id}
              loading={loading}
              defaultSortColumn="timestamp"
              defaultSortDirection="desc"
              ariaLabel="Transactions table"
              dense
              emptyState={
                <EmptyState
                  compact
                  icon={<RefreshCw aria-hidden="true" className="h-6 w-6" />}
                  title="No transactions found"
                  description="No transactions match the current filter."
                />
              }
              onRowClick={(tx) => navigate(`/explorer/transactions/${tx.id}`)}
            />
            {(total !== 0 || transactions.length > 0) && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                showing={{
                  from: transactions.length ? (page - 1) * PAGE_SIZE + 1 : 0,
                  to: (page - 1) * PAGE_SIZE + transactions.length,
                  total,
                }}
              />
            )}
          </>
        )}
      </div>
    </ExplorerLayout>
  );
}

function senderLabel(tx: ExplorerTransactionView): string {
  const type = tx.type.toLowerCase();
  if (type.includes('credential') || type.includes('batch')) {
    return tx.sender || '—';
  }
  return tx.sender || '—';
}

function shorten(value: string): string {
  if (!value || value.length <= 18) return value;
  return `${value.slice(0, 12)}…${value.slice(-6)}`;
}