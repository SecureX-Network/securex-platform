import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Cpu,
  Hash,
  Layers,
  Network,
  ShieldCheck,
  Users,
  Waypoints,
} from 'lucide-react';
import { useExplorerChain } from '../providers/chainContext';
import { useChainResource } from '../hooks/useChainResource';
import {
  getBlocks,
  getRecentTransactions,
  type ExplorerBlockView,
  type ExplorerTransactionView,
} from '../services/chainApi';
import {
  formatChainTime,
  formatCount,
  formatRelativeTime,
  humanizeToken,
  isEmptyIdentifier,
  explorerRoutes,
} from '../utils/format';
import { PageHeader, RawJsonPanel, StatCard } from '../components/ExplorerWidgets';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorPanel,
  HashText,
  LoadingPanel,
  RefreshButton,
  StaleDataNotice,
  TableShell,
  TableSkeleton,
  Td,
  Th,
  TableRow,
  type Tone,
} from '../components/primitives';

function statusTone(status: string | null, error: string | null): {
  tone: Tone;
  label: string;
} {
  if (error) return { tone: 'bad', label: 'Unavailable' };
  if (!status) return { tone: 'neutral', label: 'Connecting' };
  const upper = status.toUpperCase();
  if (upper === 'RUNNING' || upper === 'UP') return { tone: 'ok', label: 'Operational' };
  if (upper === 'DEGRADED') return { tone: 'warn', label: 'Degraded' };
  return { tone: 'warn', label: status };
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const chain = useExplorerChain();
  const { data, status, error, loading, refreshing, reload, updatedAt } = chain;

  const blocks = useChainResource<{ blocks: ExplorerBlockView[] }>(
    () => getBlocks(1, 5),
    { pollMs: 45_000 },
  );
  const transactions = useChainResource<{ transactions: ExplorerTransactionView[] }>(
    () => getRecentTransactions(1, 5),
    { pollMs: 45_000 },
  );

  const { tone, label } = statusTone(status?.status ?? null, error);

  // Every figure below comes from the API. `metrics` is best-effort, so its
  // absence is shown as "—" rather than defaulted to 0, which would read as a
  // real measurement that was never made.
  const stats = useMemo(
    () => ({
      networkStatus: label,
      blockHeight: status?.height ?? null,
      transactions: data?.metrics?.transactionCount ?? null,
      validators: status ? `${status.activeValidatorCount}/${status.validatorCount}` : null,
      peers: status?.peerCount ?? null,
      protocolVersion: status?.protocolVersion ?? null,
      nodeVersion: data?.health?.nodeVersion ?? status?.nodeVersion ?? null,
    }),
    [label, status, data],
  );

  const blocksLoading = blocks.loading;
  const anyError = error ?? blocks.error ?? transactions.error;

  return (
    <>
      <PageHeader
        title="SECUREX BLOCKCHAIN EXPLORER"
        subtitle="Public network visibility for the SecureX trust infrastructure."
        action={<RefreshButton onClick={reload} refreshing={refreshing} />}
      />

      {anyError && (
        <div className="mb-6">
          <Card padded={false}>
            <ErrorPanel
              message={
                error
                  ? 'The SecureX Blockchain API could not be reached, so no network figures can be shown.'
                  : 'Part of the chain data could not be loaded. Nothing is shown in place of it.'
              }
              onRetry={reload}
              retrying={refreshing}
            />
          </Card>
        </div>
      )}

      {/* Non-fatal: a failed refresh above data that is still valid. */}
      {error && status && (
        <div className="mb-6">
          <StaleDataNotice message="The latest refresh failed." onRetry={reload} />
        </div>
      )}

      {/* Network status header — real values, verbatim. */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-explorer-border bg-explorer-raised text-explorer-accent-text">
              <Activity aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-explorer-faint">
                Network Status
              </p>
              <div className="mt-1 flex items-center gap-2">
                {loading && !status ? (
                  <span className="text-lg font-bold text-explorer-faint">…</span>
                ) : (
                  <span className="text-lg font-bold text-explorer-text">
                    {stats.networkStatus}
                  </span>
                )}
                <Badge tone={tone} dot>
                  {label}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-explorer-faint">
                Node ID
              </dt>
              <dd className="mt-0.5">
                {status?.nodeId ? (
                  <HashText value={status.nodeId} start={8} end={6} />
                ) : (
                  <span className="text-explorer-faint">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-explorer-faint">
                Last Checked
              </dt>
              <dd className="mt-0.5 text-sm text-explorer-subtext">
                {updatedAt ? formatRelativeTime(updatedAt.toISOString()) : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="mb-8 grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Block Height"
          value={loading && stats.blockHeight === null ? '—' : formatCount(stats.blockHeight)}
          icon={<Layers aria-hidden="true" className="h-5 w-5" />}
          hint="Committed chain height"
          loading={loading && stats.blockHeight === null}
        />
        <StatCard
          label="Transactions"
          value={formatCount(stats.transactions)}
          icon={<Waypoints aria-hidden="true" className="h-5 w-5" />}
          hint="Recorded on chain"
          loading={loading && stats.transactions === null}
          accent="purple"
        />
        <StatCard
          label="Validators"
          value={stats.validators ?? '—'}
          icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
          hint="Active / total"
          loading={loading && stats.validators === null}
        />
        <StatCard
          label="Peers"
          value={formatCount(stats.peers)}
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          hint="Connected peers"
          loading={loading && stats.peers === null}
          accent="neutral"
        />
        <StatCard
          label="Protocol Version"
          value={stats.protocolVersion ?? '—'}
          icon={<Cpu aria-hidden="true" className="h-5 w-5" />}
          hint="Chain protocol"
          loading={loading && stats.protocolVersion === null}
        />
        <StatCard
          label="Node Version"
          value={stats.nodeVersion ?? '—'}
          icon={<Boxes aria-hidden="true" className="h-5 w-5" />}
          hint="Running software"
          loading={loading && stats.nodeVersion === null}
          accent="purple"
        />
        <StatCard
          label="Issuers"
          value={formatCount(data?.state?.issuers ?? null)}
          icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
          hint="Registered on chain"
          loading={loading && !data}
        />
        <StatCard
          label="Credentials"
          value={formatCount(data?.state?.credentials ?? null)}
          icon={<Hash aria-hidden="true" className="h-5 w-5" />}
          hint="Anchored on chain"
          loading={loading && !data}
          accent="neutral"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padded={false}>
          <div className="p-5 pb-0">
            <CardHeader
              icon={<Layers aria-hidden="true" className="h-4 w-4" />}
              title="Latest Blocks"
              description="Newest committed blocks, newest first."
              action={
                <Link
                  to={explorerRoutes.blocks}
                  className="text-xs font-medium text-explorer-accent-text transition-colors hover:text-explorer-accent-text-hover"
                >
                  View all
                </Link>
              }
            />
          </div>

          {blocksLoading ? (
            <div className="p-5">
              <TableSkeleton rows={4} cols={4} />
            </div>
          ) : blocks.error ? (
            <ErrorPanel
              title="Could not load blocks"
              message={blocks.error}
              onRetry={blocks.reload}
            />
          ) : (blocks.data?.blocks.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Layers aria-hidden="true" className="h-6 w-6" />}
              title="No blocks have been committed yet"
              description="The network is operational, but no blocks have been committed yet. This chain is at genesis."
            />
          ) : (
            <TableShell minWidth="min-w-[560px]">
              <thead>
                <tr>
                  <Th>Height</Th>
                  <Th>Hash</Th>
                  <Th>Time (UTC)</Th>
                  <Th className="text-right">Txs</Th>
                </tr>
              </thead>
              <tbody>
                {blocks.data?.blocks.map((block) => (
                  <TableRow
                    key={block.hash}
                    onClick={() => navigate(explorerRoutes.block(block.height))}
                  >
                    <Td className="whitespace-nowrap font-medium tabular-nums text-explorer-text">
                      {formatCount(block.height)}
                    </Td>
                    <Td>
                      <HashText value={block.hash} />
                    </Td>
                    <Td className="whitespace-nowrap">{formatChainTime(block.timestamp)}</Td>
                    <Td className="text-right tabular-nums">{block.transactionCount}</Td>
                  </TableRow>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-0">
            <CardHeader
              icon={<Waypoints aria-hidden="true" className="h-4 w-4" />}
              title="Latest Transactions"
              description="Compiled from the transactions inside committed blocks."
              action={
                <Link
                  to={explorerRoutes.transactions}
                  className="text-xs font-medium text-explorer-accent-text transition-colors hover:text-explorer-accent-text-hover"
                >
                  View all
                </Link>
              }
            />
          </div>

          {transactions.loading ? (
            <div className="p-5">
              <TableSkeleton rows={4} cols={3} />
            </div>
          ) : transactions.error ? (
            <ErrorPanel
              title="Could not load transactions"
              message={transactions.error}
              onRetry={transactions.reload}
            />
          ) : (transactions.data?.transactions.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Waypoints aria-hidden="true" className="h-6 w-6" />}
              title="No transactions have been recorded yet"
              description="The network is operational, but no transactions have been committed yet. The chain currently sits at genesis with no transaction history."
            />
          ) : (
            <TableShell minWidth="min-w-[560px]">
              <thead>
                <tr>
                  <Th>Transaction ID</Th>
                  <Th>Type</Th>
                  <Th>Time (UTC)</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.data?.transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    onClick={() => navigate(explorerRoutes.transaction(tx.id))}
                  >
                    <Td>
                      <HashText value={tx.id} start={12} end={8} />
                    </Td>
                    <Td>
                      <Badge tone="info">{humanizeToken(tx.type)}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap">{formatChainTime(tx.timestamp)}</Td>
                  </TableRow>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
      </div>

      {/* Blockchain state — human readable, raw payload behind a labelled toggle. */}
      <Card className="mt-5">
        <CardHeader
          icon={<Network aria-hidden="true" className="h-4 w-4" />}
          title="Blockchain State"
          description="Aggregate counters the SecureX node reports for its current state."
        />
        {loading && !data ? (
          <LoadingPanel label="Loading state" />
        ) : !data?.state ? (
          <p className="text-sm text-explorer-subtext">
            The chain state could not be read.
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  ['Height', data.state.height],
                  ['Issuers', data.state.issuers],
                  ['Credentials', data.state.credentials],
                  ['Validators', data.state.validators],
                  ['Keys', data.state.keys],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-explorer-border bg-explorer-bg/60 p-3.5"
                >
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-explorer-faint">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-explorer-text">
                    {formatCount(value)}
                  </dd>
                </div>
              ))}
            </dl>
            <RawJsonPanel data={data.state} />
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-xs leading-relaxed text-explorer-faint">
        {isEmptyIdentifier(status?.currentProposer) &&
        (data?.state?.validators ?? 0) > 0 &&
        status?.height === 0 ? (
          <>
            This chain has a genesis block and no further activity has been
            committed. Figures above are reported live by the SecureX node.
          </>
        ) : (
          <>All figures are read live from the SecureX Blockchain node.</>
        )}
      </p>
    </>
  );
}
