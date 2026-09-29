import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { classNames } from '@/utils';
import { truncateHash } from '../utils/format';

// ---------------------------------------------------------------------------
// SECUREX BLOCKCHAIN EXPLORER — DARK UI PRIMITIVES
//
// The application's shared UI kit (`@/components/ui`) is built for the
// SecureX light theme — white surfaces and slate text — and its base classes
// cannot be reliably overridden on a #050505 background. The Explorer therefore
// carries its own small primitive set, styled from the same design language
// (rounded cards, soft borders, restrained accents) on the Explorer's dark
// palette. Icons and `classNames` are still shared.
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
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-explorer-border bg-explorer-raised text-explorer-accent">
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
      'bg-explorer-accent text-white hover:bg-blue-500 border border-explorer-accent',
    outline:
      'border border-explorer-line bg-explorer-raised text-explorer-text hover:border-explorer-accent hover:text-white',
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

const toneClasses: Record<Tone, string> = {
  ok: 'border-trust-500/30 bg-trust-500/10 text-trust-400',
  warn: 'border-warning-500/30 bg-warning-500/10 text-warning-400',
  bad: 'border-danger-500/30 bg-danger-500/10 text-danger-400',
  info: 'border-explorer-accent/30 bg-explorer-accent/10 text-blue-400',
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
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-explorer-line bg-explorer-raised text-explorer-faint transition-colors hover:border-explorer-accent hover:text-explorer-accent"
    >
      {copied ? (
        <Check aria-hidden="true" className="h-3 w-3 text-trust-400" />
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
        className="explorer-spin h-6 w-6 text-explorer-accent"
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
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-danger-500/30 bg-danger-500/10 text-danger-400">
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
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3"
    >
      <p className="text-xs leading-relaxed text-warning-300">
        {message} Showing the last data that was successfully read.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-warning-200 underline underline-offset-4 hover:text-white"
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
