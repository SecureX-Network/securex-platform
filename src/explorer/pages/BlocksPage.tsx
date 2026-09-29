import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useChainResource } from '../hooks/useChainResource';
import { getBlocks, type ExplorerBlockView } from '../services/chainApi';
import {
  formatChainTime,
  formatCount,
  explorerRoutes,
} from '../utils/format';
import { PageHeader } from '../components/ExplorerWidgets';
import {
  Badge,
  Card,
  CopyButton,
  EmptyState,
  ErrorPanel,
  ExplorerButton,
  HashText,
  RefreshButton,
  StaleDataNotice,
  TableShell,
  TableSkeleton,
  TableRow,
  Td,
  Th,
} from '../components/primitives';

const PAGE_SIZE = 15;

export default function BlocksPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const resource = useChainResource<{ blocks: ExplorerBlockView[]; hasMore: boolean }>(
    () => getBlocks(page, PAGE_SIZE),
    { deps: [page], pollMs: 45_000 },
  );

  const blocks = resource.data?.blocks ?? [];
  const hasMore = resource.data?.hasMore ?? false;
  // The chain returns a bare page with no total, so "showing X–Y of the rows
  // returned so far" is the only honest framing available.
  const from = blocks.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = (page - 1) * PAGE_SIZE + blocks.length;

  return (
    <>
      <PageHeader
        title="Blocks"
        subtitle="Every block committed to the SecureX chain, newest first. Each row links to its full record."
        crumbs={[{ label: 'Explorer', to: explorerRoutes.overview }, { label: 'Blocks' }]}
        action={
          <RefreshButton onClick={resource.reload} refreshing={resource.refreshing} />
        }
      />

      {resource.error && !resource.loading && (
        <div className="mb-5">
          <Card padded={false}>
            <ErrorPanel
              message={`${resource.error} Blocks could not be read from the chain.`}
              onRetry={resource.reload}
              retrying={resource.refreshing}
            />
          </Card>
        </div>
      )}

      {resource.error && blocks.length > 0 && (
        <div className="mb-5">
          <StaleDataNotice message="The latest refresh failed." onRetry={resource.reload} />
        </div>
      )}

      <Card padded={false}>
        {resource.loading ? (
          <div className="p-5">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : blocks.length === 0 ? (
          <EmptyState
            icon={<Layers aria-hidden="true" className="h-6 w-6" />}
            title="No blocks have been committed yet"
            description={
              page > 1
                ? 'There are no blocks on this page. The chain may be shorter than expected.'
                : 'The network is operational, but no blocks have been committed yet.'
            }
            action={
              page > 1 ? (
                <ExplorerButton onClick={() => setPage(1)}>Back to first page</ExplorerButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <TableShell minWidth="min-w-[880px]">
              <thead>
                <tr>
                  <Th>Height</Th>
                  <Th>Block Hash</Th>
                  <Th>Proposer</Th>
                  <Th>Time (UTC)</Th>
                  <Th className="text-right">Txs</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <TableRow
                    key={block.hash}
                    onClick={() => navigate(explorerRoutes.block(block.height))}
                  >
                    <Td className="whitespace-nowrap font-medium tabular-nums text-explorer-text">
                      {formatCount(block.height)}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-2">
                        <HashText value={block.hash} />
                        <CopyButton value={block.hash} label="block hash" />
                      </span>
                    </Td>
                    <Td>
                      {block.proposerId ? (
                        <HashText value={block.proposerId} start={8} end={6} />
                      ) : (
                        <span className="text-explorer-faint" title="No proposer on this block">
                          —
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{formatChainTime(block.timestamp)}</Td>
                    <Td className="text-right tabular-nums">{block.transactionCount}</Td>
                    <Td>
                      <Badge tone="ok" dot>
                        Committed
                      </Badge>
                    </Td>
                  </TableRow>
                ))}
              </tbody>
            </TableShell>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-explorer-border px-5 py-4">
              <p className="text-xs text-explorer-faint">
                Showing {from}–{to}
                {hasMore && ' (more available)'}
              </p>
              <div className="flex items-center gap-2">
                <ExplorerButton
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                  Previous
                </ExplorerButton>
                <span className="text-xs tabular-nums text-explorer-subtext">Page {page}</span>
                <ExplorerButton onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>
                  Next
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                </ExplorerButton>
              </div>
            </div>
          </>
        )}
      </Card>

      {blocks.length > 0 && blocks.every((b) => b.transactionCount === 0) && (
        <p className="mt-5 text-center text-xs leading-relaxed text-explorer-faint">
          Every block listed contains no transactions. This chain has a genesis
          block and no recorded activity beyond it.
        </p>
      )}

      <p className="mt-5 text-center text-xs leading-relaxed text-explorer-faint">
        The SecureX protocol commits only what it records — there is no gas,
        mining or contract-deployment concept on this chain, so none is shown.
      </p>
    </>
  );
}
