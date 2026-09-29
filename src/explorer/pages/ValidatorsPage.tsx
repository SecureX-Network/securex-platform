import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useChainResource } from '../hooks/useChainResource';
import { getValidators, type ExplorerValidatorView } from '../services/chainApi';
import { formatChainTime, humanizeToken, explorerRoutes } from '../utils/format';
import { PageHeader } from '../components/ExplorerWidgets';
import {
  Badge,
  Card,
  CopyButton,
  EmptyState,
  ErrorPanel,
  HashText,
  RefreshButton,
  StaleDataNotice,
  TableShell,
  TableRow,
  TableSkeleton,
  Td,
  Th,
} from '../components/primitives';

export default function ValidatorsPage() {
  const navigate = useNavigate();

  const resource = useChainResource<ExplorerValidatorView[]>(() => getValidators(), {
    pollMs: 45_000,
  });

  const validators = resource.data ?? [];
  const activeCount = validators.filter((v) => v.active).length;

  return (
    <>
      <PageHeader
        title="Validators"
        subtitle="Public identities of the validators authorised to propose blocks on the SecureX chain. This chain is permissioned: only enrolled validators can commit."
        crumbs={[{ label: 'Explorer', to: explorerRoutes.overview }, { label: 'Validators' }]}
        action={<RefreshButton onClick={resource.reload} refreshing={resource.refreshing} />}
      />

      {validators.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Badge tone="info">
            {activeCount} active of {validators.length}
          </Badge>
        </div>
      )}

      {resource.error && !resource.loading && (
        <div className="mb-5">
          <Card padded={false}>
            <ErrorPanel
              message={`${resource.error} Validators could not be read from the chain.`}
              onRetry={resource.reload}
              retrying={resource.refreshing}
            />
          </Card>
        </div>
      )}

      {resource.error && validators.length > 0 && (
        <div className="mb-5">
          <StaleDataNotice message="The latest refresh failed." onRetry={resource.reload} />
        </div>
      )}

      <Card padded={false}>
        {resource.loading ? (
          <div className="p-5">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : validators.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck aria-hidden="true" className="h-6 w-6" />}
            title="No validators are enrolled"
            description="The network is reachable, but no validator identities have been published on the chain."
          />
        ) : (
          <TableShell minWidth="min-w-[820px]">
            <thead>
              <tr>
                <Th>Validator ID</Th>
                <Th>Status</Th>
                <Th>Public Key</Th>
                <Th>Enrolled (UTC)</Th>
              </tr>
            </thead>
            <tbody>
              {validators.map((validator) => (
                <TableRow
                  key={validator.id}
                  onClick={() => navigate(explorerRoutes.validator(validator.id))}
                >
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <HashText value={validator.id} start={12} end={8} />
                      <CopyButton value={validator.id} label="validator id" />
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={validator.active ? 'ok' : 'neutral'} dot={validator.active}>
                      {validator.active ? 'Active' : humanizeToken('inactive')}
                    </Badge>
                  </Td>
                  <Td>
                    <HashText
                      value={validator.publicKey.replace(/\s+/g, ' ')}
                      start={22}
                      end={10}
                    />
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatChainTime(validator.addedAt)}
                  </Td>
                </TableRow>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <p className="mt-5 text-center text-xs leading-relaxed text-explorer-faint">
        Only public identities are shown. Validator signing keys are never
        published on the chain and are not retrievable through this Explorer.
      </p>
    </>
  );
}
