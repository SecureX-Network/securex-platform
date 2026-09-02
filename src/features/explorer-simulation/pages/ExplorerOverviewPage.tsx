import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Hash,
  Layers,
  Search,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import {
  getBlocks,
  getNetworkStats,
  getTransactions,
  type NetworkStats,
} from '@/services/api/blockchainService';
import type { BlockchainBlock, BlockchainTransaction } from '@/types';
import { formatDate, truncateHash } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';

export default function ExplorerOverviewPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [statsData, blocksData, txsData] = await Promise.all([
          getNetworkStats(),
          getBlocks(1),
          getTransactions(1),
        ]);
        if (!active) return;
        setStats(statsData);
        setBlocks(blocksData.data.slice(0, 5));
        setTransactions(txsData.data.slice(0, 5));
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Unable to load network data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    const heightNumber = Number(value);
    if (!Number.isNaN(heightNumber) && Number.isInteger(heightNumber)) {
      navigate(`/explorer/blocks/${value}`);
      return;
    }
    navigate(`/explorer/transactions/${value}`);
  }

  const statusBadge = () => {
    if (!stats) return <Badge variant="info">—</Badge>;
    if (stats.networkStatus === 'HEALTHY') return <Badge variant="success">Healthy</Badge>;
    if (stats.networkStatus === 'DEGRADED') return <Badge variant="warning">Degraded</Badge>;
    return <Badge variant="info">Syncing</Badge>;
  };

  return (
    <ExplorerLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            SecureX Blockchain Explorer
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Explore blocks, transactions, and network activity on the SecureX
            Trust Network. Data shown is <span className="font-medium">demo data</span>.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search aria-hidden="true" className="h-4 w-4" />
            </span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by block height or transaction ID"
              className="pl-9"
              aria-label="Search blocks or transactions"
            />
          </div>
          <Button type="submit" variant="primary" size="lg" leftIcon={<Search className="h-4 w-4" />}>
            Search
          </Button>
        </form>

        {error ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card padding="md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
                    <Layers aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Block Height
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {loading ? '—' : (stats?.totalBlocks ?? 0)}
                    </p>
                  </div>
                </div>
              </Card>
              <Card padding="md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-trust-50 text-trust-600">
                    <Activity aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total Transactions
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {loading ? '—' : (stats?.totalTransactions ?? 0)}
                    </p>
                  </div>
                </div>
              </Card>
              <Card padding="md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Server aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Active Validators
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {loading ? '—' : `${stats?.nodesOnline ?? 0}/${stats?.totalNodes ?? 0}`}
                    </p>
                  </div>
                </div>
              </Card>
              <Card padding="md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
                    <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Network Status
                    </p>
                    <span className="mt-1 inline-block">{statusBadge()}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card
                title="Recent Blocks"
                padding="none"
                footer={
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/explorer/blocks')}
                    >
                      View all blocks
                    </Button>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Height</th>
                        <th className="px-4 py-3">Hash</th>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Txs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading
                        ? Array.from({ length: 5 }, (_, i) => (
                            <tr key={i}>
                              {Array.from({ length: 4 }, (_, j) => (
                                <td key={j} className="px-4 py-3.5">
                                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : blocks.map((block) => (
                            <tr
                              key={block.height}
                              onClick={() => navigate(`/explorer/blocks/${block.height}`)}
                              className="cursor-pointer transition-colors hover:bg-slate-50"
                            >
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-securex-700">
                                  <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                                  {block.height}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                                {truncateHash(block.hash, 10, 6)}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-500">
                                {formatDate(block.timestamp, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-600">
                                {block.transactionCount}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card
                title="Recent Transactions"
                padding="none"
                footer={
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/explorer/transactions')}
                    >
                      View all transactions
                    </Button>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading
                        ? Array.from({ length: 5 }, (_, i) => (
                            <tr key={i}>
                              {Array.from({ length: 4 }, (_, j) => (
                                <td key={j} className="px-4 py-3.5">
                                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : transactions.map((tx) => (
                            <tr
                              key={tx.id}
                              onClick={() => navigate(`/explorer/transactions/${tx.id}`)}
                              className="cursor-pointer transition-colors hover:bg-slate-50"
                            >
                              <td className="px-4 py-3.5 font-mono text-xs text-securex-700">
                                {truncateHash(tx.id, 10, 6)}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-600">
                                {tx.type.replace(/_/g, ' ')}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-500">
                                {formatDate(tx.timestamp, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
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
              </Card>
            </div>
          </>
        )}

        <Card className="border-dashed">
          <div className="flex items-center gap-3">
            <Boxes aria-hidden="true" className="h-5 w-5 shrink-0 text-securex-600" />
            <p className="text-sm text-slate-500">
              This is demo data used to illustrate the SecureX Trust Network
              explorer. Connect the platform to a live node for real-time data.
            </p>
          </div>
        </Card>
      </div>
    </ExplorerLayout>
  );
}