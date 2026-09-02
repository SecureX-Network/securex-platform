import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Select } from '@/components/ui';
import { Table } from '@/components/ui';
import { ErrorState } from '@/components/ui';
import { getTransactions } from '@/services/api/blockchainService';
import type { BlockchainTransaction } from '@/types';
import { formatDate, truncateHash } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Issued', value: 'CREDENTIAL_ISSUED' },
  { label: 'Verified', value: 'CREDENTIAL_VERIFIED' },
  { label: 'Revoked', value: 'CREDENTIAL_REVOKED' },
];

export default function ExplorerTransactionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getTransactions(page)
      .then((res) => {
        if (!active) return;
        const all = res.data;
        const filtered =
          typeFilter === 'all'
            ? all
            : all.filter((tx) => tx.type === typeFilter);
        setTransactions(filtered);
        setTotal(typeFilter === 'all' ? res.total : filtered.length);
        setTotalPages(typeFilter === 'all' ? res.totalPages : Math.max(1, Math.ceil(filtered.length / 12)));
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
  }, [page, typeFilter]);

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  function statusBadge(status: BlockchainTransaction['status']) {
    if (status === 'CONFIRMED') return <Badge size="sm" variant="success" icon={<CheckCircle2 className="h-3 w-3" />}>Confirmed</Badge>;
    if (status === 'PENDING') return <Badge size="sm" variant="warning" icon={<RefreshCw className="h-3 w-3" />}>Pending</Badge>;
    return <Badge size="sm" variant="danger">Failed</Badge>;
  }

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-securex-600" />
              Transactions
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse recent credential and network transactions.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => handleTypeChange(e.target.value)}
              options={TYPE_OPTIONS}
              aria-label="Filter transactions by type"
            />
          </div>
        </div>

        {error ? (
          <ErrorState
            title="Could not load transactions"
            description={error}
            onRetry={() => setPage(page)}
          />
        ) : (
          <>
            <Table<BlockchainTransaction>
              columns={[
                {
                  key: 'id',
                  header: 'ID',
                  accessor: (tx) => (
                    <span className="font-mono text-xs text-securex-700">
                      {truncateHash(tx.id, 12, 8)}
                    </span>
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
                { key: 'status', header: 'Status', accessor: (tx) => statusBadge(tx.status) },
                { key: 'confirmations', header: 'Confirmations', align: 'right', accessor: (tx) => tx.confirmations },
              ]}
              data={transactions}
              rowKey={(tx) => tx.id}
              loading={loading}
              defaultSortColumn="timestamp"
              defaultSortDirection="desc"
              ariaLabel="Transactions table"
              dense
              emptyState={
                <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                  <p className="text-sm font-medium">No transactions for this filter</p>
                </div>
              }
              onRowClick={(tx) => navigate(`/explorer/transactions/${tx.id}`)}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showing={{
                from: transactions.length ? (page - 1) * 12 + 1 : 0,
                to: (page - 1) * 12 + transactions.length,
                total,
              }}
            />
          </>
        )}
      </div>
    </ExplorerLayout>
  );
}