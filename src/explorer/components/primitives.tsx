import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { classNames } from '@/utils';
import { truncateHash } from '../utils/format';

// ---------------------------------------------------------------------------
// SECUREX BLOCKCHAIN EXPLORER — UI PRIMITIVES
//
// Built from the SecureX design language (0.5rem radii, soft 1px borders,
// restrained accent usage, Inter + JetBrains Mono) but scoped to the Explorer's
// own token set so it can render correctly in both themes.
//
// Colours are never hard-coded here. Every surface, border and tone resolves
// through the `explorer-*` / `ok` / `warn` / `bad` / `info` tokens, which are
// CSS custom properties switched by the `dark-theme` class on <html> — the same
// convention `src/styles/globals.css` uses for the application. That means a
// theme change is one class on one element, with no re-render of this tree.
//
// The application's shared UI kit (`@/components/ui`) is deliberately NOT used
// here: its base classes hard-code white surfaces and slate text, which cannot
// be reliably overridden on the Explorer's dark palette. `classNames` and the
// Lucide icon set are still shared.
// ---------------------------------------------------------------------------

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={classNames(
        'explorer-card',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-explorer-border bg-explorer-raised text-explorer-accent-text">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-wide text-explorer-text">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-explorer-subtext">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────

type ButtonTone = 'primary' | 'ghost' | 'outline';

export function ExplorerButton({
  children,
  onClick,
  tone = 'outline',
  type = 'button',
  disabled,
  title,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const tones: Record<ButtonTone, string> = {
    primary:
      'bg-explorer-accent-solid text-explorer-on-accent hover:bg-explorer-accent-solid-hover border border-explorer-accent-solid',
    outline:
      'border border-explorer-line bg-explorer-raised text-explorer-text hover:border-explorer-accent hover:text-explorer-text',
    ghost: 'border border-transparent text-explorer-subtext hover:text-explorer-text hover:bg-explorer-raised',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={classNames(
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function RefreshButton({
  onClick,
  refreshing,
  label = 'Refresh',
}: {
  onClick: () => void;
  refreshing?: boolean;
  label?: string;
}) {
  return (
    <ExplorerButton onClick={onClick} disabled={refreshing} ariaLabel={label}>
      <RefreshCw
        aria-hidden="true"
        className={classNames('h-3.5 w-3.5', refreshing && 'explorer-spin')}
      />
      <span className="hidden sm:inline">{refreshing ? 'Refreshing' : label}</span>
    </ExplorerButton>
  );
}

// ── Badges ───────────────────────────────────────────────────────────────────

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

// Surfaces and borders use the tone colour at low opacity, which keeps a single
// tinted look in both themes; the `*-text` foreground is the per-theme step
// chosen to stay legible on that tint (a dark green on light, a light green on
// dark). Using one shade for both roles is what makes a badge disappear.
const toneClasses: Record<Tone, string> = {
  ok: 'border-ok/30 bg-ok/10 text-ok-text',
  warn: 'border-warn/30 bg-warn/10 text-warn-text',
  bad: 'border-bad/30 bg-bad/10 text-bad-text',
  info: 'border-info/30 bg-info/10 text-info-text',
  neutral: 'border-explorer-line bg-explorer-raised text-explorer-subtext',
};

export function Badge({
  children,
  tone = 'neutral',
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={classNames('h-1.5 w-1.5 rounded-full bg-current', tone === 'ok' && 'explorer-pulse-dot')}
        />
      )}
      {children}
    </span>
  );
}

// ── Hash display + copy ──────────────────────────────────────────────────────

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(() => {
    const write = navigator.clipboard?.writeText(value);
    if (write) {
      void write.then(
        () => setCopied(true),
        () => setCopied(false),
      );
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-explorer-line bg-explorer-raised text-explorer-faint transition-colors hover:border-explorer-accent hover:text-explorer-accent-text"
    >
      {copied ? (
        <Check aria-hidden="true" className="h-3 w-3 text-ok-text" />
      ) : (
        <Copy aria-hidden="true" className="h-3 w-3" />
      )}
    </button>
  );
}

/** Monospace hash, truncated for tables but always fully copyable. */
export function HashText({
  value,
  start = 10,
  end = 8,
  truncate = true,
  className,
}: {
  value: string;
  start?: number;
  end?: number;
  truncate?: boolean;
  className?: string;
}) {
  if (!value) {
    return <span className="text-explorer-faint">—</span>;
  }
  return (
    <code
      title={value}
      className={classNames(
        'font-mono text-[0.8125rem] text-explorer-subtext',
        className,
      )}
    >
      {truncate ? truncateHash(value, start, end) : value}
    </code>
  );
}

export function HashCell({ value, label }: { value: string; label: string }) {
  if (!value) return <span className="text-explorer-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <HashText value={value} />
      <CopyButton value={value} label={label} />
    </span>
  );
}

// ── Key/value rows ───────────────────────────────────────────────────────────

export function KeyValue({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-explorer-border/70 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-xs font-medium uppercase tracking-wide text-explorer-faint">
        {label}
      </dt>
      <dd
        className={classNames(
          'min-w-0 break-words text-sm text-explorer-text',
          mono && 'font-mono text-[0.8125rem]',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

// ── Loading / empty / error ──────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={classNames(
        'explorer-shimmer-host rounded-md bg-explorer-raised',
        className,
      )}
    />
  );
}

export function LoadingPanel({ label = 'Loading chain data' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-14 text-center"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="explorer-spin h-6 w-6 text-explorer-accent-text"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-explorer-subtext">{label}…</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-explorer-border bg-explorer-raised text-explorer-faint">
          {icon}
        </span>
      )}
      <h3 className="text-sm font-semibold text-explorer-text">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-explorer-subtext">
        {description}
      </p>
      {action}
    </div>
  );
}

/**
 * The Explorer's service-unavailable state. It is explicit that the chain could
 * not be read, offers a retry, and — critically — never substitutes demo or
 * placeholder data to paper over the failure.
 */
export function ErrorPanel({
  title = 'Blockchain service unavailable',
  message,
  onRetry,
  retrying,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-bad/30 bg-bad/10 text-bad-text">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 9v4" strokeLinecap="round" />
          <path d="M12 17h.01" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <h3 className="text-sm font-semibold text-explorer-text">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-explorer-subtext">
        {message ??
          'The SecureX Blockchain API could not be reached. No data is shown because none could be verified.'}
      </p>
      {onRetry && (
        <ExplorerButton tone="primary" onClick={onRetry} disabled={retrying}>
          <RefreshCw
            aria-hidden="true"
            className={classNames('h-3.5 w-3.5', retrying && 'explorer-spin')}
          />
          {retrying ? 'Retrying' : 'Retry'}
        </ExplorerButton>
      )}
    </div>
  );
}

/** Inline non-blocking error strip, shown above data that is still valid. */
export function StaleDataNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3"
    >
      <p className="text-xs leading-relaxed text-warn-text">
        {message} Showing the last data that was successfully read.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-warn-text underline underline-offset-4 hover:text-explorer-text"
        >
          Retry now
        </button>
      )}
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

export function TableShell({
  children,
  minWidth = 'min-w-[720px]',
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <table className={classNames('w-full border-collapse text-left', minWidth)}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={classNames(
        'whitespace-nowrap border-b border-explorer-border px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-explorer-faint',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={classNames(
        'border-b border-explorer-border/60 px-4 py-3.5 text-sm text-explorer-subtext',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function TableRow({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={classNames(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-explorer-raised',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-explorer-border/60">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-4">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
