import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Layers } from 'lucide-react';
import { EmptyState, ErrorState, Pagination, Table } from '@/components/ui';
import { formatDate } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { HashDisplay } from '../components/HashDisplay';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getExplorerBlocks,
  type ExplorerBlockView,
} from '../services/explorerService';

const PAGE_SIZE = 10;

export default function ExplorerBlocksPage() {
  const navigate = useNavigate();
  const mode = getDataSourceMode();
  const [page, setPage] = useState(1);
  const [blocks, setBlocks] = useState<ExplorerBlockView[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getExplorerBlocks(page, PAGE_SIZE)
      .then((res) => {
        if (!active) return;
        setBlocks(res.blocks);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.hasMore ? page + 1 : page));
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load blocks.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, mode]);

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
              <Layers aria-hidden="true" className="h-6 w-6 text-securex-600" />
              Blocks
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse blocks produced on the SecureX Trust Network.
            </p>
          </div>
          <DataSourceBadge mode={mode} />
        </div>

        {mode === 'DEMO' && (
          <p className="text-xs text-slate-400">Showing demo block data.</p>
        )}

        {error ? (
          <ErrorState
            title="Could not load blocks"
            description={error}
            onRetry={() => setPage(page)}
          />
        ) : (
          <>
            <Table<ExplorerBlockView>
              columns={[
                {
                  key: 'height',
                  header: 'Height',
                  sortable: true,
                  align: 'right',
                  accessor: (b) => (
                    <span className="inline-flex items-center gap-1.5 font-medium text-securex-700">
                      <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                      {b.height}
                    </span>
                  ),
                  sortValue: (b) => b.height,
                },
                {
                  key: 'hash',
                  header: 'Hash',
                  accessor: (b) => (
                    <HashDisplay value={b.hash} startChars={12} endChars={8} />
                  ),
                },
                {
                  key: 'timestamp',
                  header: 'Timestamp',
                  sortable: true,
                  sortValue: (b) => b.timestamp,
                  accessor: (b) => (
                    <span className="text-sm text-slate-500">
                      {formatDate(b.timestamp, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  ),
                },
                { key: 'proposerId', header: 'Validator', accessor: (b) => shortenHash(b.proposerId) },
                { key: 'transactionCount', header: 'Transactions', align: 'right', accessor: (b) => b.transactionCount },
                { key: 'version', header: 'Version', align: 'right', accessor: (b) => b.version },
              ]}
              data={blocks}
              rowKey={(b) => String(b.height)}
              loading={loading}
              defaultSortColumn="height"
              defaultSortDirection="desc"
              ariaLabel="Blocks table"
              dense
              emptyState={
                <EmptyState
                  compact
                  icon={<Layers aria-hidden="true" className="h-6 w-6" />}
                  title="No blocks found"
                  description="There are no blocks recorded on this network yet."
                />
              }
              onRowClick={(b) => navigate(`/explorer/blocks/${b.height}`)}
            />
            {(total !== 0 || blocks.length > 0) && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                showing={{
                  from: blocks.length ? (page - 1) * PAGE_SIZE + 1 : 0,
                  to: (page - 1) * PAGE_SIZE + blocks.length,
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

function shortenHash(hash: string): string {
  if (!hash || hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}