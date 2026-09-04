import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Users, UsersRound, XCircle } from 'lucide-react';
import {
  Badge,
  Breadcrumb,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Table,
} from '@/components/ui';
import { classNames } from '@/utils';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { HashDisplay } from '../components/HashDisplay';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getExplorerValidators,
  type ExplorerValidatorView,
} from '../services/explorerService';

export default function ExplorerValidatorsPage() {
  const navigate = useNavigate();
  const mode = getDataSourceMode();
  const [query, setQuery] = useState('');
  const [validators, setValidators] = useState<ExplorerValidatorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getExplorerValidators()
      .then((data) => {
        if (active) setValidators(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load validators.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return validators.filter(
      (v) => !q || v.id.toLowerCase().includes(q) || v.publicKey.toLowerCase().includes(q),
    );
  }, [query, validators]);

  const active = validators.filter((v) => v.active).length;

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Validators breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            { label: 'Validators', active: true },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
              <ShieldCheck aria-hidden="true" className="h-6 w-6 text-securex-600" />
              Validators
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Validators are the authorized nodes responsible for producing and
              finalizing blocks on the SecureX Network (Permissioned Proof of
              Authority).
            </p>
          </div>
          <DataSourceBadge mode={mode} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
            iconClass="bg-securex-50 text-securex-600"
            label="Total Validators"
            value={validators.length}
            loading={loading}
          />
          <MetricCard
            icon={<UsersRound aria-hidden="true" className="h-5 w-5" />}
            iconClass="bg-trust-50 text-trust-600"
            label="Active Validators"
            value={active}
            loading={loading}
          />
          <MetricCard
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            iconClass="bg-purple-50 text-purple-600"
            label="Authorized Set"
            value={validators.length ? `${active}/${validators.length}` : '—'}
            loading={loading}
          />
        </div>

        {error ? (
          <ErrorState
            title="Could not load validators"
            description={error}
            onRetry={() => setValidators((prev) => [...prev])}
            retryLabel="Retry"
          />
        ) : (
          <>
            <Card padding="none">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
                <div className="w-full sm:max-w-xs">
                  <Input
                    label="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by ID or public key"
                    aria-label="Search validators"
                    size="sm"
                  />
                </div>
              </div>

              <Table<ExplorerValidatorView>
                columns={[
                  {
                    key: 'id',
                    header: 'Validator ID',
                    accessor: (v) => (
                      <HashDisplay value={v.id} startChars={12} endChars={8} showCopyButton />
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    accessor: (v) =>
                      v.active ? (
                        <Badge
                          size="sm"
                          variant="success"
                          icon={<CheckCircle2 className="h-3 w-3" />}
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          size="sm"
                          variant="danger"
                          icon={<XCircle className="h-3 w-3" />}
                        >
                          Inactive
                        </Badge>
                      ),
                  },
                  {
                    key: 'addedAt',
                    header: 'Added',
                    accessor: (v) => (
                      <span className="text-sm text-slate-500">
                        {v.addedAt ? new Date(v.addedAt).toLocaleDateString() : '—'}
                      </span>
                    ),
                  },
                ]}
                data={filtered}
                rowKey={(v) => v.id}
                loading={loading}
                ariaLabel="Validators table"
                dense
                emptyState={
                  <EmptyState
                    compact
                    icon={<ShieldCheck aria-hidden="true" className="h-6 w-6" />}
                    title="No validators found"
                    description="No validators match the current search."
                  />
                }
                onRowClick={(v) => navigate(`/explorer/validators/${v.id}`)}
              />
            </Card>

            <p className="text-xs text-slate-400">
              {mode === 'DEMO'
                ? 'Validator data shown is demo data for illustration.'
                : 'Validator registry is served live from the SecureX Blockchain V2 node.'}
            </p>
          </>
        )}
      </div>
    </ExplorerLayout>
  );
}

function MetricCard({
  icon,
  iconClass,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card padding="md">
      <div className={classNames('flex items-center gap-3')}>
        <span
          className={classNames(
            'flex h-11 w-11 items-center justify-center rounded-lg',
            iconClass,
          )}
        >
          {icon}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-xl font-bold text-slate-900">
            {loading ? '—' : value}
          </p>
        </div>
      </div>
    </Card>
  );
}