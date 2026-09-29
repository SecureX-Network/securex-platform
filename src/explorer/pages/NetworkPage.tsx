import { Link } from 'react-router-dom';
import { Activity, Cpu, Network, Users, Waypoints, Layers } from 'lucide-react';
import { useExplorerChain } from '../providers/chainContext';
import { useChainResource } from '../hooks/useChainResource';
import { getPeers, type ExplorerPeers } from '../services/chainApi';
import {
  formatChainTime,
  formatCount,
  formatDuration,
  explorerRoutes,
} from '../utils/format';
import { Freshness, PageHeader, RawJsonPanel, StatCard } from '../components/ExplorerWidgets';
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
  TableShell,
  TableSkeleton,
  Td,
  Th,
  TableRow,
} from '../components/primitives';

export default function NetworkPage() {
  const chain = useExplorerChain();
  const { data, status, error, loading, refreshing, reload, updatedAt } = chain;

  const peers = useChainResource<ExplorerPeers>(() => getPeers(), { pollMs: 45_000 });

  const metrics = data?.metrics ?? null;
  const network = data?.network ?? null;
  const health = data?.health ?? null;

  return (
    <>
      <PageHeader
        title="Network"
        subtitle="Live network, consensus and peer information reported by the SecureX node. Every value below is read from the chain at request time."
        crumbs={[{ label: 'Explorer', to: explorerRoutes.overview }, { label: 'Network' }]}
        action={<RefreshButton onClick={reload} refreshing={refreshing} />}
      />

      {error && (
        <div className="mb-6">
          <Card padded={false}>
            <ErrorPanel
              message="The SecureX Blockchain API could not be reached, so no network information can be shown."
              onRetry={reload}
              retrying={refreshing}
            />
          </Card>
        </div>
      )}

      {error && status && (
        <div className="mb-6 rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3">
          <p className="text-xs text-warning-300">
            The latest refresh failed. Showing the last data that was successfully
            read.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Network Status"
          value={status?.status ?? (error ? 'Unavailable' : '—')}
          icon={<Activity aria-hidden="true" className="h-5 w-5" />}
          hint={health ? `Node reports ${health.status}` : undefined}
          loading={loading && !status}
        />
        <StatCard
          label="Block Height"
          value={formatCount(status?.height ?? null)}
          icon={<Layers aria-hidden="true" className="h-5 w-5" />}
          hint="Committed chain height"
          loading={loading && !status}
          accent="purple"
        />
        <StatCard
          label="Peers"
          value={formatCount(status?.peerCount ?? null)}
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          hint="Connected peers"
          loading={loading && !status}
        />
        <StatCard
          label="Validators"
          value={status ? `${status.activeValidatorCount}/${status.validatorCount}` : '—'}
          icon={<Cpu aria-hidden="true" className="h-5 w-5" />}
          hint="Active / total"
          loading={loading && !status}
          accent="neutral"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<Network aria-hidden="true" className="h-4 w-4" />}
            title="Consensus & Node"
            description="Identity and consensus state of the SecureX node."
            action={<Freshness at={updatedAt} />}
          />
          {loading && !network ? (
            <LoadingPanel label="Loading network" />
          ) : !network ? (
            <p className="text-sm text-explorer-subtext">Network data unavailable.</p>
          ) : (
            <dl>
              <KeyValue label="Status">{network.status}</KeyValue>
              <KeyValue label="Consensus Status">
                {metrics ? (
                  <Badge tone={metrics.consensusStatus === 'RUNNING' ? 'ok' : 'warn'} dot>
                    {metrics.consensusStatus}
                  </Badge>
                ) : (
                  '—'
                )}
              </KeyValue>
              <KeyValue label="Node ID" mono>
                <span className="inline-flex items-center gap-2">
                  <HashText value={network.nodeId} start={16} end={10} />
                  <CopyButton value={network.nodeId} label="node id" />
                </span>
              </KeyValue>
              <KeyValue label="Current Proposer" mono>
                {status?.currentProposer ? (
                  <span className="inline-flex items-center gap-2">
                    <HashText value={status.currentProposer} start={16} end={10} />
                    <CopyButton value={status.currentProposer} label="proposer" />
                  </span>
                ) : (
                  <span className="text-explorer-faint">
                    None — no block has been proposed yet
                  </span>
                )}
              </KeyValue>
              <KeyValue label="Protocol Version">
                {metrics?.protocolVersion ?? status?.protocolVersion ?? '—'}
              </KeyValue>
              <KeyValue label="Node Version">
                {health?.nodeVersion ?? metrics?.nodeVersion ?? '—'}
              </KeyValue>
              <KeyValue label="Uptime">{formatDuration(metrics?.uptimeSeconds ?? null)}</KeyValue>
            </dl>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<Waypoints aria-hidden="true" className="h-4 w-4" />}
            title="Activity Counters"
            description="Operational counters reported by the node."
          />
          {loading && !metrics ? (
            <LoadingPanel label="Loading metrics" />
          ) : !metrics ? (
            <p className="text-sm text-explorer-subtext">
              The node did not report metrics. Values that the API does not
              provide are shown as “—” rather than estimated.
            </p>
          ) : (
            <dl>
              <KeyValue label="Blocks Recorded">{formatCount(metrics.blockCount)}</KeyValue>
              <KeyValue label="Transactions Recorded">
                {formatCount(metrics.transactionCount)}
              </KeyValue>
              <KeyValue label="Pending Transactions">
                {formatCount(network?.pendingTransactions ?? null)}
              </KeyValue>
              <KeyValue label="Validators">
                {formatCount(metrics.validatorCount)}
              </KeyValue>
              <KeyValue label="Active Validators">
                {formatCount(metrics.activeValidatorCount)}
              </KeyValue>
              <KeyValue label="Last Health Check">
                {health ? formatChainTime(health.checkedAt) : '—'}
              </KeyValue>
            </dl>
          )}
        </Card>
      </div>

      <Card className="mt-5" padded={false}>
        <div className="p-5 pb-0">
          <CardHeader
            icon={<Users aria-hidden="true" className="h-4 w-4" />}
            title="Peers"
            description="Nodes this SecureX node is connected to or knows about."
          />
        </div>

        {peers.loading ? (
          <div className="p-5">
            <TableSkeleton rows={3} cols={4} />
          </div>
        ) : peers.error ? (
          <ErrorPanel
            title="Could not load peers"
            message={peers.error}
            onRetry={peers.reload}
          />
        ) : (peers.data?.known.length ?? 0) === 0 &&
          (peers.data?.connected.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users aria-hidden="true" className="h-6 w-6" />}
            title="No connected peers"
            description="This SecureX node currently reports no connected or known peers. It is running as a single-node network."
          />
        ) : (
          <TableShell minWidth="min-w-[720px]">
            <thead>
              <tr>
                <Th>Node ID</Th>
                <Th>Address</Th>
                <Th>Last Seen (UTC)</Th>
                <Th>Validator</Th>
              </tr>
            </thead>
            <tbody>
              {peers.data?.known.map((peer) => (
                <TableRow key={peer.nodeId}>
                  <Td>
                    <HashText value={peer.nodeId} start={12} end={8} />
                  </Td>
                  <Td>
                    <code className="font-mono text-xs text-explorer-subtext">
                      {peer.address}
                    </code>
                  </Td>
                  <Td className="whitespace-nowrap">{formatChainTime(peer.lastSeen)}</Td>
                  <Td>
                    <Badge tone={peer.isValidator ? 'info' : 'neutral'}>
                      {peer.isValidator ? 'Validator' : 'Peer'}
                    </Badge>
                  </Td>
                </TableRow>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {network && (
        <Card className="mt-5">
          <CardHeader
            title="Raw network response"
            description="The exact payload returned by the SecureX Blockchain API."
          />
          <RawJsonPanel data={{ health, network, metrics }} label="View Raw JSON" />
        </Card>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-explorer-faint">
        SecureX does not report throughput or average block time, and this page
        does not estimate them. Fields the node does not publish are shown as
        “—”.{' '}
        <Link to={explorerRoutes.overview} className="text-explorer-accent hover:underline">
          Back to overview
        </Link>
      </p>
    </>
  );
}
