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
import { Badge, Button, Card, EmptyState, Input, Skeleton } from '@/components/ui';
import { formatDate, truncateHash } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getExplorerBlocks,
  getExplorerNetworkStatus,
  getRecentTransactions,
  type ExplorerBlockView,
  type ExplorerTransactionView,
} from '../services/explorerService';

export default function ExplorerOverviewPage() {
  const navigate = useNavigate();
  const mode = getDataSourceMode();
  const [stats, setStats] = useState<ExplorerNetworkStatusShim | null>(null);
  const [blocks, setBlocks] = useState<ExplorerBlockView[]>([]);
  const [transactions, setTransactions] = useState<ExplorerTransactionView[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [network, blocksRes, txsRes] = await Promise.all([
          getExplorerNetworkStatus(),
          getExplorerBlocks(1, 5),
          getRecentTransactions(1, 5),
        ]);
        if (!active) return;
        setStats({
          blockHeight: network.height,
          totalTransactions: txsRes.total,
          validatorCount: network.validatorCount,
          activeValidators: network.activeValidatorCount,
          peerCount: network.peerCount,
          protocolVersion: network.protocolVersion,
          status: network.status,
        });
        setBlocks(blocksRes.blocks);
        setTransactions(txsRes.transactions);
        setError(null);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load network data.');
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

  const statusLabel = stats?.status === 'RUNNING' || stats?.status === 'UP'
    ? 'HEALTHY'
    : stats?.status?.toUpperCase() ?? 'UNKNOWN';

  const statusBadge = () => {
    if (!stats) return <Badge variant="info">—</Badge>;
    if (statusLabel === 'HEALTHY') return <Badge variant="success">Healthy</Badge>;
    if (statusLabel === 'DEGRADED') return <Badge variant="warning">Degraded</Badge>;
    return <Badge variant="info">Syncing</Badge>;
  };

  return (
    <ExplorerLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              SecureX Blockchain Explorer
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Explore blocks, transactions, and network activity on the SecureX
              Trust Network.
            </p>
          </div>
          <DataSourceBadge mode={mode} />
        </div>

        {mode === 'DEMO' && (
          <p className="text-sm text-slate-500">
            <span className="font-medium">Showing demo data.</span> Connect the
            platform to a live SecureX Blockchain V2 node to display live data.
          </p>
        )}

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
              <Button variant="outline" size="sm" onClick={() => navigate(0)}>
                Retry
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Layers aria-hidden="true" className="h-5 w-5" />}
                iconClass="bg-securex-50 text-securex-600"
                label="Block Height"
                loading={loading}
              >
                {stats?.blockHeight ?? 0}
              </StatCard>
              <StatCard
                icon={<Activity aria-hidden="true" className="h-5 w-5" />}
                iconClass="bg-trust-50 text-trust-600"
                label="Transactions"
                loading={loading}
              >
                {stats?.totalTransactions ?? 0}
              </StatCard>
              <StatCard
                icon={<Server aria-hidden="true" className="h-5 w-5" />}
                iconClass="bg-purple-50 text-purple-600"
                label="Active Validators"
                loading={loading}
              >
                {`${stats?.activeValidators ?? 0}/${stats?.validatorCount ?? 0}`}
              </StatCard>
              <StatCard
                icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
                iconClass="bg-warning-50 text-warning-600"
                label="Network Status"
                loading={loading}
              >
                <span className="mt-1 inline-block">{statusBadge()}</span>
              </StatCard>
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
                {loading ? (
                  <TableSkeleton rows={5} cols={4} />
                ) : blocks.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Layers aria-hidden="true" className="h-6 w-6" />}
                    title="No blocks found"
                    description="There are no blocks on this network yet."
                  />
                ) : (
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
                        {blocks.map((block) => (
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
                )}
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
                {loading ? (
                  <TableSkeleton rows={5} cols={4} />
                ) : transactions.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Boxes aria-hidden="true" className="h-6 w-6" />}
                    title="No transactions found"
                    description="There are no transactions recorded on this network yet."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Timestamp</th>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        <Card className="border-dashed">
          <div className="flex items-center gap-3">
            <Boxes aria-hidden="true" className="h-5 w-5 shrink-0 text-securex-600" />
            <p className="text-sm text-slate-500">
              {mode === 'DEMO'
                ? 'This is demo data used to illustrate the SecureX Trust Network explorer. Connect the platform to a live node for real-time data.'
                : `Connected to SecureX Blockchain V2 ${stats?.protocolVersion ?? ''}. Permissioned Proof-of-Authority with ${stats?.activeValidators ?? 0} active validators.`}
            </p>
          </div>
        </Card>
      </div>
    </ExplorerLayout>
  );
}

interface ExplorerNetworkStatusShim {
  blockHeight: number;
  totalTransactions: number;
  validatorCount: number;
  activeValidators: number;
  peerCount: number;
  protocolVersion: string;
  status: string;
}

function StatCard({
  icon,
  iconClass,
  label,
  loading,
  children,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-20" />
          ) : (
            <p className="text-xl font-bold text-slate-900">{children}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-3.5">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}