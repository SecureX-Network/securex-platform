import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { Badge, Breadcrumb, Button, Card, EmptyState } from '@/components/ui';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { HashDisplay } from '../components/HashDisplay';
import { InfoRow } from '../components/InfoRow';
import { DataSourceBadge } from '../components/DataSourceBadge';
import {
  getDataSourceMode,
  getExplorerValidators,
  type ExplorerValidatorView,
} from '../services/explorerService';

export default function ExplorerValidatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mode = getDataSourceMode();
  const [validator, setValidator] = useState<ExplorerValidatorView | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setValidator(null);
    setNotFound(false);
    getExplorerValidators()
      .then((list) => {
        if (!active) return;
        const found = list.find((v) => v.id === id);
        setValidator(found ?? null);
        setNotFound(!found);
      })
      .catch(() => {
        if (active) setNotFound(true);
      });
    return () => {
      active = false;
    };
  }, [id, mode]);

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Validator breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            { label: 'Validators', href: '/explorer/validators' },
            { label: 'Validator', active: true },
          ]}
        />

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/explorer/validators')}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Validators
          </Button>
          <DataSourceBadge mode={mode} />
        </div>

        {!validator && notFound ? (
          <EmptyState
            icon={<ShieldCheck aria-hidden="true" className="h-7 w-7" />}
            title="Validator not found"
            description={`No validator exists with the ID "${id}". It may have been removed or the address is incorrect.`}
            actionButton={{
              label: 'Back to validators',
              onClick: () => navigate('/explorer/validators'),
            }}
          />
        ) : !validator ? (
          <Card>
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              Loading validator…
            </div>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                Validator
              </h1>
              <span className="inline-flex items-center gap-2">
                {validator.active ? (
                  <Badge
                    variant="success"
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge variant="danger" icon={<XCircle className="h-3.5 w-3.5" />}>
                    Inactive
                  </Badge>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Validator Identity" bodyClassName="p-0">
                <dl className="divide-y divide-slate-100 px-5">
                  <InfoRow
                    label="ID"
                    value={
                      <span className="break-all font-mono text-xs">{validator.id}</span>
                    }
                  />
                  <InfoRow
                    label="Status"
                    value={
                      <span className="inline-block">
                        {validator.active ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Public Key"
                    value={<HashDisplay value={validator.publicKey} fullDisplay />}
                  />
                  <InfoRow
                    label="Added"
                    value={
                      validator.addedAt
                        ? new Date(validator.addedAt).toLocaleString()
                        : '—'
                    }
                  />
                </dl>
              </Card>

              <Card title="Consensus Role" bodyClassName="p-0">
                <dl className="divide-y divide-slate-100 px-5">
                  <InfoRow
                    label="Consensus"
                    value="Permissioned Proof of Authority"
                  />
                  <InfoRow label="Member" value={validator.active ? 'Yes' : 'No'} />
                  <InfoRow
                    label="Note"
                    value={
                      <span className="text-sm text-slate-500">
                        A validator is an authorized block-producing node. Only the
                        fields exposed by the node API are shown.
                      </span>
                    }
                  />
                </dl>
              </Card>
            </div>

            <p className="text-xs text-slate-400">
              {mode === 'DEMO'
                ? 'Validator data shown is demo data for illustration.'
                : 'Validator identity is served live from the SecureX Blockchain V2 node.'}
            </p>
          </>
        )}
      </div>
    </ExplorerLayout>
  );
}