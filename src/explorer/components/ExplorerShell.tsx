import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Boxes, ExternalLink, Network, Search, ShieldCheck, Waypoints, X } from 'lucide-react';
import { classNames } from '@/utils';
import { classifySearchQuery } from '../services/chainApi';
import { explorerRoutes } from '../utils/format';
import { useExplorerChain } from '../providers/chainContext';
import type { ChainConnection } from '../providers/chainConnection';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Badge, ExplorerButton, RefreshButton } from './primitives';

const NAV_ITEMS = [
  { to: explorerRoutes.overview, label: 'Overview', icon: Boxes, end: true },
  { to: explorerRoutes.blocks, label: 'Blocks', icon: Boxes, end: false },
  {
    to: explorerRoutes.transactions,
    label: 'Transactions',
    icon: Waypoints,
    end: false,
  },
  {
    to: explorerRoutes.validators,
    label: 'Validators',
    icon: ShieldCheck,
    end: false,
  },
  { to: explorerRoutes.network, label: 'Network', icon: Network, end: false },
];

/**
 * Connection state is derived in `chainConnection.ts` and consumed here verbatim.
 *
 * This used to collapse everything into "Operational" / "Connecting" /
 * "Unavailable", which made a free-tier node that was merely asleep look exactly
 * like a broken network. The fourth state, `Waking`, is what lets the header
 * tell a visitor "the node is starting up" instead of "SecureX is down".
 *
 * The badge never invents health: `operational` is only reachable once a real
 * health request has succeeded.
 */
function ConnectionBanner({
  connection,
  onRetry,
}: {
  connection: ChainConnection;
  onRetry: () => void;
}) {
  if (!connection.title) return null;

  return (
    <div
      className="border-b border-explorer-border bg-explorer-raised/60"
      data-testid="chain-connection-banner"
      role="status"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-explorer-text">{connection.title}</p>
          {connection.detail && (
            <p className="mt-0.5 text-xs text-explorer-subtext">{connection.detail}</p>
          )}
        </div>
        {/* The retry is always offered, and it always starts a fresh bounded
            cycle — including after the ladder has been spent. */}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-explorer-line bg-explorer-surface px-3 text-xs font-semibold text-explorer-text transition-colors hover:border-explorer-accent hover:text-explorer-accent-text"
        >
          Retry now
        </button>
      </div>
    </div>
  );
}

export function ExplorerShell({ children }: { children: ReactNode }) {
  const { connection, refreshing, reload } = useExplorerChain();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    // Only the two lookups the API genuinely supports: block height and
    // transaction id. There is no block-hash endpoint, so no hash search is
    // advertised here.
    const result = classifySearchQuery(value);
    navigate(
      result.kind === 'block'
        ? explorerRoutes.block(result.height)
        : explorerRoutes.transaction(result.id),
    );
    setQuery('');
  }

  return (
    <div className="relative min-h-screen">
      <div className="explorer-backdrop" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="explorer-header">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 py-4">
              <Link to={explorerRoutes.overview} className="group flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-explorer-accent to-explorer-accent-alt text-white shadow-lg shadow-explorer-accent/25">
                  <Boxes aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-sm font-bold tracking-[0.18em] text-explorer-text">
                    SECUREX
                  </span>
                  <span className="truncate text-[0.6875rem] font-medium tracking-[0.12em] text-explorer-accent-text">
                    BLOCKCHAIN EXPLORER
                  </span>
                </span>
              </Link>

              <div className="flex shrink-0 items-center gap-2">
                <a
                  href="https://app-securex.sp-net.in/"
                  className="hidden h-9 items-center gap-1.5 rounded-lg border border-explorer-line bg-explorer-raised px-3 text-sm font-medium text-explorer-text transition-colors hover:border-explorer-accent hover:text-explorer-accent-text lg:inline-flex"
                >
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  SecureX App
                </a>
                <span className="hidden sm:block" data-testid="network-status-badge">
                  <Badge tone={connection.tone} dot>
                    {connection.label}
                  </Badge>
                </span>
                <RefreshButton onClick={reload} refreshing={refreshing} />
                <ThemeToggle />
              </div>
            </div>

            <form onSubmit={onSubmit} className="pb-3" role="search">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-explorer-faint"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by block height or transaction ID"
                  aria-label="Search by block height or transaction ID"
                  className="h-10 w-full rounded-xl border border-explorer-line bg-explorer-surface/80 pl-10 pr-24 text-sm text-explorer-text placeholder:text-explorer-faint focus:border-explorer-accent focus:outline-none"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-explorer-faint transition-colors hover:text-explorer-text"
                    >
                      <X aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="h-7 rounded-lg bg-explorer-accent-solid px-3 text-xs font-semibold text-explorer-on-accent transition-colors hover:bg-explorer-accent-solid-hover"
                    >
                      Search
                    </button>
                  )}
                </div>
              </div>
            </form>

            <nav
              aria-label="Explorer sections"
              className="-mx-1 flex gap-1 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    classNames(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-explorer-accent/10 text-explorer-accent-text ring-1 ring-inset ring-explorer-accent/30'
                        : 'text-explorer-subtext hover:bg-explorer-raised hover:text-explorer-text',
                    )
                  }
                >
                  <item.icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <ConnectionBanner connection={connection} onRetry={reload} />

        <main className="explorer-page flex-1">{children}</main>

        <footer className="mt-8 border-t border-explorer-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-xs text-explorer-faint sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-explorer-accent-text" />
              Public network visibility for the SecureX trust infrastructure.
            </p>
            <nav aria-label="SecureX sites" className="flex flex-wrap items-center gap-4">
              <a
                href="https://securex.sp-net.in/"
                className="transition-colors hover:text-explorer-text"
              >
                securex.sp-net.in
              </a>
              <a
                href="https://app-securex.sp-net.in/"
                className="transition-colors hover:text-explorer-text"
              >
                SecureX App
              </a>
              <a
                href="https://api-securex.sp-net.in/api/blockchain/health"
                className="transition-colors hover:text-explorer-text"
              >
                API
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}

export { ExplorerButton };
