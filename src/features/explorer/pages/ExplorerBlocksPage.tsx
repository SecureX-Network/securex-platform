import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Layers } from 'lucide-react';
import { Button } from '@/components/ui';
import { Table } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { ErrorState } from '@/components/ui';
import { getBlocks } from '@/services/api/blockchainService';
import type { BlockchainBlock } from '@/types';
import { formatDate, truncateHash } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';

export default function ExplorerBlocksPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getBlocks(page)
      .then((res) => {
        if (!active) return;
        setBlocks(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
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
  }, [page]);

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
          <Button variant="outline" size="sm" onClick={() => navigate('/explorer')}>
            Overview
          </Button>
        </div>

        {error ? (
          <ErrorState
            title="Could not load blocks"
            description={error}
            onRetry={() => setPage(page)}
          />
        ) : (
          <>
            <Table<BlockchainBlock>
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
                    <span className="font-mono text-xs text-slate-600">
                      {truncateHash(b.hash, 12, 8)}
                    </span>
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
                { key: 'validator', header: 'Validator', accessor: (b) => b.validator },
                { key: 'transactionCount', header: 'Transactions', align: 'right', accessor: (b) => b.transactionCount },
                { key: 'size', header: 'Size', align: 'right', accessor: (b) => `${(b.size / 1000).toFixed(1)} KB` },
              ]}
              data={blocks}
              rowKey={(b) => String(b.height)}
              loading={loading}
              defaultSortColumn="height"
              defaultSortDirection="desc"
              ariaLabel="Blocks table"
              dense
              onRowClick={(b) => navigate(`/explorer/blocks/${b.height}`)}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showing={{ from: blocks.length ? (page - 1) * 10 + 1 : 0, to: (page - 1) * 10 + blocks.length, total }}
            />
          </>
        )}
      </div>
    </ExplorerLayout>
  );
}