// ---------------------------------------------------------------------------
// SECUREX BLOCKCHAIN EXPLORER — FORMATTING & ROUTES
//
// Thin explorer-specific presentation helpers. Generic formatting is reused
// from the shared `@/utils` (`formatDate`, `truncateHash`, `classNames`); only
// the pieces the Explorer's public route tree actually needs are added here.
// ---------------------------------------------------------------------------

import { truncateHash } from '@/utils';

export { truncateHash };

/** Routes owned by the dedicated Explorer site (it owns `/`, not `/explorer`). */
export const explorerRoutes = {
  overview: '/',
  blocks: '/blocks',
  block: (height: number | string) => `/blocks/${height}`,
  transactions: '/transactions',
  transaction: (id: string) => `/transactions/${encodeURIComponent(id)}`,
  validators: '/validators',
  validator: (id: string) => `/validators/${encodeURIComponent(id)}`,
  network: '/network',
} as const;

/** UTC timestamp, the canonical way a chain explorer reports chain time. */
export function formatChainTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)} UTC`;
}

/**
 * Relative age, e.g. "4 min ago". The chain's genesis block is dated
 * 2026-01-01, so a large value here is expected and correct — it is not a bug
 * and must not be dressed up as recent activity.
 */
export function formatRelativeTime(value?: string | null, now = new Date()): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const future = seconds < 0;
  const abs = Math.abs(seconds);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.34524],
    ['month', 12],
    ['year', Number.POSITIVE_INFINITY],
  ];

  let value2 = abs;
  for (const [unit, size] of units) {
    if (value2 < size || unit === 'year') {
      const amount = Math.floor(value2);
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      const text = rtf.format(future ? amount : -amount, unit);
      return text;
    }
    value2 /= size;
  }
  return '—';
}

/** "1,234" — large counters read far better grouped. */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

/** Uptime in seconds -> "3h 12m". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** Byte-ish sizes, used only where the API really reports a size field. */
export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

/** `CREDENTIAL_ISSUED` -> `Credential issued`. */
export function humanizeToken(value: string | null | undefined): string {
  if (!value) return '—';
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  if (!spaced) return '—';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** The genesis block has no proposer; the API returns an empty string. */
export function isEmptyIdentifier(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0 || /^0+$/.test(value.trim());
}
