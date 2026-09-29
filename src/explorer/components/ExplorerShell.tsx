import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Boxes, Network, Search, ShieldCheck, Waypoints, X } from 'lucide-react';
import { classNames } from '@/utils';
import { classifySearchQuery } from '../services/chainApi';
import { explorerRoutes } from '../utils/format';
import { useExplorerChain } from '../providers/chainContext';
import { Badge, ExplorerButton, RefreshButton, type Tone } from './primitives';

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
 * "Operational" is shown only when the API actually reports a reachable node.
 * An error never renders as healthy, and a healthy node with no activity is
 * reported as such rather than dressed up.
 */
function statusPresentation(
  error: string | null,
  status: string | null,
): { tone: Tone; label: string } {
  if (error) return { tone: 'bad', label: 'Unavailable' };
  if (!status) return { tone: 'neutral', label: 'Connecting' };
  const upper = status.toUpperCase();
  if (upper === 'RUNNING' || upper === 'UP') return { tone: 'ok', label: 'Operational' };
  if (upper === 'DEGRADED') return { tone: 'warn', label: 'Degraded' };
  return { tone: 'warn', label: status };
}

export function ExplorerShell({ children }: { children: ReactNode }) {
  const { status, error, refreshing, reload } = useExplorerChain();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { tone, label } = statusPresentation(error, status?.status ?? null);

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
        <header className="sticky top-0 z-20 border-b border-explorer-border bg-explorer-bg/80 backdrop-blur-xl">
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
                  <span className="truncate text-[0.6875rem] font-medium tracking-[0.12em] text-explorer-accent">
                    BLOCKCHAIN EXPLORER
                  </span>
                </span>
              </Link>

              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden sm:block" data-testid="network-status-badge">
                  <Badge tone={tone} dot>
                    {label}
                  </Badge>
                </span>
                <RefreshButton onClick={reload} refreshing={refreshing} />
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
                      className="h-7 rounded-lg bg-explorer-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                      Search
                    </button>
                  )}
                </div>
              </div>
            </form>

            <nav aria-label="Explorer sections" className="-mx-1 flex gap-1 overflow-x-auto pb-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    classNames(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-explorer-accent/12 text-explorer-accent ring-1 ring-inset ring-explorer-accent/25'
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

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="mt-8 border-t border-explorer-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-xs text-explorer-faint sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-explorer-accent" />
              Public, read-only view of the SecureX trust infrastructure.
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
