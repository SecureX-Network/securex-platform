import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useChainResource } from '../hooks/useChainResource';
import { getValidatorById, type ExplorerValidatorView } from '../services/chainApi';
import { formatChainTime, formatRelativeTime, explorerRoutes } from '../utils/format';
import { PageHeader, RawJsonPanel } from '../components/ExplorerWidgets';
import {
  Badge,
  Card,
  CardHeader,
  CopyButton,
  EmptyState,
  ErrorPanel,
  HashText,
  KeyValue,
  LoadingPanel,
  RefreshButton,
} from '../components/primitives';

export default function ValidatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const validatorId = id ?? '';

  const resource = useChainResource<ExplorerValidatorView | null>(
    () => getValidatorById(validatorId),
    { enabled: validatorId.length > 0, deps: [validatorId] },
  );

  const validator = resource.data;

  return (
    <>
      <PageHeader
        title="Validator"
        subtitle="Public validator identity as recorded on the SecureX chain."
        crumbs={[
          { label: 'Explorer', to: explorerRoutes.overview },
          { label: 'Validators', to: explorerRoutes.validators },
          {
            label: validator
              ? `${validator.id.slice(0, 8)}…${validator.id.slice(-4)}`
              : 'Detail',
          },
        ]}
        action={<RefreshButton onClick={resource.reload} refreshing={resource.refreshing} />}
      />

      {resource.error && (
        <Card padded={false}>
          <ErrorPanel
            message={`${resource.error} This validator could not be read from the chain.`}
            onRetry={resource.reload}
            retrying={resource.refreshing}
          />
        </Card>
      )}

      {resource.loading && validator === undefined && (
        <Card>
          <LoadingPanel label="Loading validator" />
        </Card>
      )}

      {resource.notFound && (
        <Card padded={false}>
          <EmptyState
            icon={<ShieldCheck aria-hidden="true" className="h-6 w-6" />}
            title="Validator not found"
            description={`No validator with the ID "${validatorId}" is enrolled on the SecureX chain.`}
            action={
              <Link
                to={explorerRoutes.validators}
                className="text-sm font-medium text-explorer-accent-text hover:text-explorer-accent-text-hover"
              >
                Browse all validators
              </Link>
            }
          />
        </Card>
      )}

      {!resource.loading && !resource.error && validator === null && (
        <Card padded={false}>
          <EmptyState
            icon={<ShieldCheck aria-hidden="true" className="h-6 w-6" />}
            title="Validator not found"
            description={`No validator with the ID "${validatorId}" is enrolled on the SecureX chain.`}
            action={
              <Link
                to={explorerRoutes.validators}
                className="text-sm font-medium text-explorer-accent-text hover:text-explorer-accent-text-hover"
              >
                Browse all validators
              </Link>
            }
          />
        </Card>
      )}

      {validator && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
                title="Validator Identity"
                action={
                  <Badge tone={validator.active ? 'ok' : 'neutral'} dot={validator.active}>
                    {validator.active ? 'Active' : 'Inactive'}
                  </Badge>
                }
              />
              <dl>
                <KeyValue label="Validator ID" mono>
                  <span className="inline-flex items-start gap-2">
                    <HashText value={validator.id} truncate={false} className="break-all" />
                    <CopyButton value={validator.id} label="validator id" />
                  </span>
                </KeyValue>
                <KeyValue label="Status">
                  {validator.active ? 'Active' : 'Inactive'}
                </KeyValue>
                <KeyValue label="Enrolled (UTC)">
                  {formatChainTime(validator.addedAt)}
                </KeyValue>
                <KeyValue label="Enrolled">
                  {formatRelativeTime(validator.addedAt)}
                </KeyValue>
              </dl>
            </Card>

            <Card className="mt-5">
              <CardHeader
                title="Public Key"
                description="The Ed25519 public key this validator signs blocks with. This is public by design — the corresponding private key never leaves the validator."
              />
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-explorer-border bg-explorer-bg p-4 font-mono text-xs leading-relaxed text-explorer-subtext">
                {validator.publicKey}
              </pre>
              <div className="mt-3">
                <CopyButton value={validator.publicKey.trim()} label="public key" />
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Related" />
              <div className="space-y-2.5">
                <Link
                  to={explorerRoutes.validators}
                  className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                >
                  <span className="text-explorer-subtext">All validators</span>
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-explorer-faint" />
                </Link>
                <Link
                  to={explorerRoutes.blocks}
                  className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                >
                  <span className="text-explorer-subtext">Proposed blocks</span>
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-explorer-faint" />
                </Link>
              </div>
            </Card>

            <Card>
              <CardHeader title="Raw validator" />
              <RawJsonPanel
                data={{
                  id: validator.id,
                  status: validator.active ? 'ACTIVE' : 'INACTIVE',
                  active: validator.active,
                  addedAt: validator.addedAt,
                }}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
