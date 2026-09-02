import { useEffect, useState } from 'react';
import {
  Activity,
  Layers,
  Server,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge, Breadcrumb, Card, EmptyState, Input, Table } from '@/components/ui';
import { classNames } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { HashDisplay } from '../components/HashDisplay';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getExplorerNetworkStatus,
  getExplorerPeers,
  getExplorerHealth,
  type ExplorerNetworkStatus,
  type ExplorerPeers,
} from '../services/explorerService';

export default function ExplorerNetworkPage() {
  const mode = getDataSourceMode();
  const [status, setStatus] = useState<ExplorerNetworkStatus | null>(null);
  const [peers, setPeers] = useState<ExplorerPeers | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      getExplorerNetworkStatus(),
      getExplorerPeers(),
      getExplorerHealth().catch(() => null),
    ])
      .then(([st, pe]) => {
        if (!active) return;
        setStatus(st);
        setPeers(pe);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load network data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  const filtered = (peers?.connected ?? []).filter((id) => {
    const q = query.trim().toLowerCase();
    return !q || id.toLowerCase().includes(q);
  });

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Network breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            { label: 'Network', active: true },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
              <Server aria-hidden="true" className="h-6 w-6 text-securex-600" />
              Network
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              View the health, consensus, and connectivity of the permissioned
              SecureX Network (Permissioned Proof of Authority).
            </p>
          </div>
          <DataSourceBadge mode={mode} />
        </div>

        {error ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Layers className="h-5 w-5" />}
                iconClass="bg-securex-50 text-securex-600"
                label="Current Height"
                value={status?.height}
                loading={loading}
              />
              <StatCard
                icon={<Users className="h-5 w-5" />}
                iconClass="bg-trust-50 text-trust-600"
                label="Validators"
                value={status?.validatorCount}
                loading={loading}
              />
              <StatCard
                icon={<Activity className="h-5 w-5" />}
                iconClass="bg-purple-50 text-purple-600"
                label="Connected Peers"
                value={status?.peerCount}
                loading={loading}
              />
              <StatCard
                icon={<ShieldCheck className="h-5 w-5" />}
                iconClass="bg-warning-50 text-warning-600"
                label="Pending Transactions"
                value={status?.pendingTransactions}
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Consensus" bodyClassName="p-0">
                <dl className="divide-y divide-slate-100 px-5">
                  <Row label="Mode" value="Permissioned PoA" />
                  <Row label="Validator Count" value={status?.validatorCount} />
                  <Row
                    label="Current Proposer"
                    value={
                      status?.currentProposer ? (
                        <HashDisplay
                          value={status.currentProposer}
                          startChars={12}
                          endChars={8}
                        />
                      ) : (
                        '—'
                      )
                    }
                  />
                </dl>
              </Card>

              <Card title="Node" bodyClassName="p-0">
                <dl className="divide-y divide-slate-100 px-5">
                  <Row label="Status" value={status?.status ?? '—'} />
                  <Row label="Node ID" value={status ? shorten(status.nodeId) : '—'} />
                  <Row label="Protocol Version" value={status?.protocolVersion ?? '—'} />
                  <Row label="Node Version" value={status?.nodeVersion ?? '—'} />
                </dl>
              </Card>

              <Card title="Blockchain" bodyClassName="p-0">
                <dl className="divide-y divide-slate-100 px-5">
                  <Row label="Height" value={status?.height} />
                  <Row label="Active Validators" value={status?.activeValidatorCount} />
                  <Row label="Pending Transactions" value={status?.pendingTransactions} />
                </dl>
              </Card>
            </div>

            <Card title="Connected Peers" padding="none">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
                <div className="w-full sm:max-w-xs">
                  <Input
                    label="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by node ID"
                    aria-label="Search network peers"
                    size="sm"
                  />
                </div>
              </div>

              <Table<{ id: string; address: string; known: boolean }>
                columns={[
                  {
                    key: 'id',
                    header: 'Node ID',
                    accessor: (p) => (
                      <HashDisplay value={p.id} startChars={14} endChars={10} showCopyButton />
                    ),
                  },
                  {
                    key: 'address',
                    header: 'Address',
                    accessor: (p) => (
                      <span className="font-mono text-xs text-slate-500">{p.address}</span>
                    ),
                  },
                  {
                    key: 'known',
                    header: 'Status',
                    accessor: () => (
                      <Badge size="sm" variant="success">
                        Connected
                      </Badge>
                    ),
                  },
                ]}
                data={filtered.map((id) => {
                  const known = peers?.known.find((k) => k.nodeId === id);
                  return {
                    id,
                    address: known?.address ?? '—',
                    known: true,
                  };
                })}
                rowKey={(p) => p.id}
                ariaLabel="Network peers table"
                dense
                loading={loading}
                emptyState={
                  <EmptyState
                    compact
                    icon={<Server aria-hidden="true" className="h-6 w-6" />}
                    title="No peers connected"
                    description="No nodes are currently connected."
                  />
                }
              />
            </Card>

            <p className="text-xs text-slate-400">
              {mode === 'DEMO'
                ? 'Network data shown is demo data for illustration.'
                : 'Network status is served live from the SecureX Blockchain V2 node.'}
            </p>
          </>
        )}
      </div>
    </ExplorerLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function shorten(value: string): string {
  if (!value || value.length <= 20) return value;
  return `${value.slice(0, 12)}…`;
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <span className={classNames('flex h-11 w-11 items-center justify-center rounded-lg', iconClass)}>
          {icon}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-900">
            {loading ? '—' : value ?? '—'}
          </p>
        </div>
      </div>
    </Card>
  );
}