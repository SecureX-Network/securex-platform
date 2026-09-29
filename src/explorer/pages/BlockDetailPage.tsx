import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, Layers, Waypoints } from 'lucide-react';
import { useChainResource } from '../hooks/useChainResource';
import { getBlockByHeight, type ExplorerBlockView } from '../services/chainApi';
import {
  formatChainTime,
  formatCount,
  formatRelativeTime,
  humanizeToken,
  isEmptyIdentifier,
  explorerRoutes,
} from '../utils/format';
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
  Td,
  Th,
  TableShell,
  TableRow,
} from '../components/primitives';

const GENESIS_PREVIOUS_HASH = /^0+$/;

export default function BlockDetailPage() {
  const { height: heightParam } = useParams<{ height: string }>();
  const navigate = useNavigate();

  const height = Number(heightParam);
  const valid = /^\d+$/.test(heightParam ?? '') && Number.isSafeInteger(height) && height >= 0;

  const resource = useChainResource<ExplorerBlockView>(
    () => getBlockByHeight(height),
    { enabled: valid, deps: [heightParam] },
  );

  if (!valid) {
    return (
      <>
        <PageHeader
          title="Invalid block height"
          crumbs={[
            { label: 'Explorer', to: explorerRoutes.overview },
            { label: 'Blocks', to: explorerRoutes.blocks },
            { label: 'Invalid' },
          ]}
        />
        <Card padded={false}>
          <EmptyState
            icon={<Layers aria-hidden="true" className="h-6 w-6" />}
            title="That is not a valid block height"
            description={`"${heightParam}" is not a block height. Heights are whole numbers, starting at 0 for the genesis block.`}
            action={
              <Link
                to={explorerRoutes.blocks}
                className="text-sm font-medium text-explorer-accent hover:text-blue-300"
              >
                Browse all blocks
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const block = resource.data;
  const isGenesis = block?.height === 0;

  return (
    <>
      <PageHeader
        title={block ? `Block ${formatCount(block.height)}` : 'Block'}
        subtitle={
          block
            ? `Committed at ${formatChainTime(block.timestamp)} · ${formatRelativeTime(block.timestamp)}`
            : 'Reading this block from the SecureX chain.'
        }
        crumbs={[
          { label: 'Explorer', to: explorerRoutes.overview },
          { label: 'Blocks', to: explorerRoutes.blocks },
          { label: block ? `#${block.height}` : heightParam! },
        ]}
        action={
          <RefreshButton
            onClick={resource.reload}
            refreshing={resource.refreshing}
          />
        }
      />

      {resource.notFound && (
        <Card padded={false}>
          <EmptyState
            icon={<Layers aria-hidden="true" className="h-6 w-6" />}
            title="Block not found"
            description={`The SecureX chain has no block at height ${height}. It may not have been committed yet.`}
            action={
              <Link
                to={explorerRoutes.blocks}
                className="text-sm font-medium text-explorer-accent hover:text-blue-300"
              >
                Browse all blocks
              </Link>
            }
          />
        </Card>
      )}

      {resource.error && !resource.notFound && (
        <Card padded={false}>
          <ErrorPanel
            message={`${resource.error} This block could not be read from the chain.`}
            onRetry={resource.reload}
            retrying={resource.refreshing}
          />
        </Card>
      )}

      {resource.loading && !block && (
        <Card>
          <LoadingPanel label="Loading block" />
        </Card>
      )}

      {block && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardHeader
                icon={<Layers aria-hidden="true" className="h-4 w-4" />}
                title="Block Overview"
                action={
                  <Badge tone="ok" dot>
                    Committed
                  </Badge>
                }
              />
              <dl>
                <KeyValue label="Height">{formatCount(block.height)}</KeyValue>
                <KeyValue label="Timestamp (UTC)">
                  {formatChainTime(block.timestamp)}
                </KeyValue>
                <KeyValue label="Relative">{formatRelativeTime(block.timestamp)}</KeyValue>
                <KeyValue label="Version">{block.version}</KeyValue>
                <KeyValue label="Transactions">{block.transactionCount}</KeyValue>
                <KeyValue label="Proposer" mono>
                  {isEmptyIdentifier(block.proposerId) ? (
                    <span className="text-explorer-faint">
                      None — the genesis block has no proposer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <HashText value={block.proposerId} truncate={false} />
                      <CopyButton value={block.proposerId} label="proposer id" />
                    </span>
                  )}
                </KeyValue>
              </dl>
            </Card>

            <Card>
              <CardHeader
                icon={<Layers aria-hidden="true" className="h-4 w-4" />}
                title="Hashes"
                description="Cryptographic links that bind this block into the chain."
              />
              <dl>
                <KeyValue label="Block Hash" mono>
                  <span className="inline-flex items-start gap-2">
                    <HashText value={block.hash} truncate={false} className="break-all" />
                    <CopyButton value={block.hash} label="block hash" />
                  </span>
                </KeyValue>
                <KeyValue label="Previous Hash" mono>
                  {block.previousHash && !GENESIS_PREVIOUS_HASH.test(block.previousHash) ? (
                    <span className="inline-flex items-start gap-2">
                      <Link
                        to={explorerRoutes.block(Math.max(0, block.height - 1))}
                        className="break-all font-mono text-[0.8125rem] text-explorer-accent hover:underline"
                      >
                        {block.previousHash}
                      </Link>
                      <CopyButton value={block.previousHash} label="previous hash" />
                    </span>
                  ) : (
                    <span className="font-mono text-[0.8125rem] text-explorer-faint">
                      {GENESIS_PREVIOUS_HASH.test(block.previousHash ?? '')
                        ? 'All zeros — genesis block, no parent'
                        : '—'}
                    </span>
                  )}
                </KeyValue>
                <KeyValue label="Merkle Root" mono>
                  {block.merkleRoot && !GENESIS_PREVIOUS_HASH.test(block.merkleRoot) ? (
                    <span className="inline-flex items-start gap-2">
                      <HashText
                        value={block.merkleRoot}
                        truncate={false}
                        className="break-all"
                      />
                      <CopyButton value={block.merkleRoot} label="merkle root" />
                    </span>
                  ) : (
                    <span className="font-mono text-[0.8125rem] text-explorer-faint">
                      {GENESIS_PREVIOUS_HASH.test(block.merkleRoot ?? '')
                        ? 'All zeros — block contains no transactions'
                        : '—'}
                    </span>
                  )}
                </KeyValue>
              </dl>
            </Card>

            <Card padded={false}>
              <div className="p-5 pb-0">
                <CardHeader
                  icon={<Waypoints aria-hidden="true" className="h-4 w-4" />}
                  title="Transactions in this block"
                  description={
                    block.transactionCount > 0
                      ? `${block.transactionCount} transaction${block.transactionCount === 1 ? '' : 's'} committed here.`
                      : undefined
                  }
                />
              </div>

              {block.transactions.length === 0 ? (
                <EmptyState
                  icon={<Waypoints aria-hidden="true" className="h-6 w-6" />}
                  title="No transactions in this block"
                  description={
                    isGenesis
                      ? 'The genesis block is created empty and anchors the chain. No transactions have been committed to the SecureX network yet.'
                      : 'This block committed no transactions.'
                  }
                />
              ) : (
                <TableShell minWidth="min-w-[620px]">
                  <thead>
                    <tr>
                      <Th>Transaction ID</Th>
                      <Th>Type</Th>
                      <Th>Sender</Th>
                      <Th>Time (UTC)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.transactions.map((tx) => (
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
                        <Td>
                          <HashText value={tx.sender} start={8} end={6} />
                        </Td>
                        <Td className="whitespace-nowrap">
                          {formatChainTime(tx.timestamp)}
                        </Td>
                      </TableRow>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Related" description="Links to adjacent chain records." />
              <div className="space-y-2.5">
                {block.height > 0 && (
                  <Link
                    to={explorerRoutes.block(block.height - 1)}
                    className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                  >
                    <span className="text-explorer-subtext">
                      Previous block{' '}
                      <span className="font-medium tabular-nums text-explorer-text">
                        #{block.height - 1}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-explorer-faint"
                    />
                  </Link>
                )}
                {block.height > 0 && (
                  <Link
                    to={explorerRoutes.block(block.height + 1)}
                    className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                  >
                    <span className="text-explorer-subtext">
                      Next block{' '}
                      <span className="font-medium tabular-nums text-explorer-text">
                        #{block.height + 1}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-explorer-faint"
                    />
                  </Link>
                )}
                <Link
                  to={explorerRoutes.blocks}
                  className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                >
                  <span className="text-explorer-subtext">All blocks</span>
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-explorer-faint" />
                </Link>
                <Link
                  to={explorerRoutes.validators}
                  className="flex items-center justify-between rounded-lg border border-explorer-border bg-explorer-bg/60 px-3.5 py-3 text-sm transition-colors hover:border-explorer-accent"
                >
                  <span className="text-explorer-subtext">Validators</span>
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-explorer-faint" />
                </Link>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Raw block"
                description="The exact record returned by the chain."
              />
              <RawJsonPanel
                data={{
                  hash: block.hash,
                  height: block.height,
                  previousHash: block.previousHash,
                  merkleRoot: block.merkleRoot,
                  timestamp: block.timestamp,
                  proposerId: block.proposerId,
                  version: block.version,
                  transactionCount: block.transactionCount,
                }}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
