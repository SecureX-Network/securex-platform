import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Code2, Info } from 'lucide-react';
import { classNames } from '@/utils';
import { formatRelativeTime } from '../utils/format';
import { Card, Skeleton } from './primitives';

// ── Page header + breadcrumbs ────────────────────────────────────────────────

export interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  subtitle,
  crumbs,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  action?: ReactNode;
}) {
  return (
    <div className="mb-7">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-explorer-faint">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight aria-hidden="true" className="h-3 w-3 text-explorer-border" />
                )}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="transition-colors hover:text-explorer-accent"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-explorer-subtext">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-explorer-text sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-explorer-subtext">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  icon,
  hint,
  loading,
  accent = 'blue',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  accent?: 'blue' | 'purple' | 'neutral';
}) {
  const accents = {
    blue: 'text-blue-400 border-explorer-accent/25 bg-explorer-accent/10',
    purple: 'text-purple-400 border-explorer-accent-alt/25 bg-explorer-accent-alt/10',
    neutral: 'text-explorer-subtext border-explorer-border bg-explorer-raised',
  } as const;

  return (
    <Card className="explorer-enter" padded={false}>
      <div className="flex items-start gap-3.5 p-4">
        {icon && (
          <span
            className={classNames(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              accents[accent],
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-explorer-faint">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-explorer-text">
              {value}
            </p>
          )}
          {hint && !loading && (
            <p className="mt-1.5 truncate text-xs text-explorer-faint">{hint}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Raw JSON (developer affordance, hidden by default) ───────────────────────

/**
 * The state overview is rendered for humans. This is the explicitly labelled
 * developer escape hatch for the exact payload the API returned — it is
 * collapsed by default and never the primary presentation.
 */
export function RawJsonPanel({
  data,
  label = 'View Raw JSON',
}: {
  data: unknown;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-explorer-border bg-explorer-raised px-3 py-1.5 text-xs font-medium text-explorer-subtext transition-colors hover:border-explorer-accent hover:text-explorer-text"
      >
        <Code2 aria-hidden="true" className="h-3.5 w-3.5" />
        {open ? 'Hide Raw JSON' : label}
      </button>

      {open && (
        <div className="relative mt-3">
          <pre className="max-h-96 overflow-auto rounded-xl border border-explorer-border bg-explorer-bg p-4 font-mono text-xs leading-relaxed text-explorer-subtext">
            {text}
          </pre>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(text).then(
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                },
                () => setCopied(false),
              );
            }}
            className="absolute right-2 top-2 rounded-md border border-explorer-line bg-explorer-raised px-2 py-1 text-[0.6875rem] text-explorer-subtext transition-colors hover:text-explorer-text"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Freshness indicator ──────────────────────────────────────────────────────

export function Freshness({ at }: { at: Date | null }) {
  if (!at) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-explorer-faint">
      <Info aria-hidden="true" className="h-3 w-3" />
      Updated {formatRelativeTime(at.toISOString())}
    </span>
  );
}
