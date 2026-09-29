/**
 * Minimal RFC 4180 CSV writer + browser download helper.
 *
 * The history and audit tables all had an "Export" affordance that either did
 * nothing (`onClick={() => {}}`) or was disabled with a "coming soon" tooltip.
 * Export is a presentation concern over rows the page already holds, so it is
 * implemented once here rather than per page.
 */

export interface CsvColumn<T> {
  /** Header text for this column. */
  header: string;
  /** Resolves the cell value. `null`/`undefined` become an empty cell. */
  value: (row: T) => string | number | null | undefined;
}

/**
 * Quote a single CSV field.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with a tab so spreadsheet
 * software treats the cell as text. Without this, a credential title such as
 * `=1+1` executes as a formula when the export is opened in Excel.
 */
function escapeField(raw: string): string {
  // RFC 4180 requires the line break inside a quoted field to be CRLF; a bare
  // LF would be a second record to a strict parser.
  const normalized = raw.replace(/\r\n|\r|\n/g, '\r\n');
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(normalized);
  const value = needsFormulaGuard ? `\t${normalized}` : normalized;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Build CSV text (including CRLF line endings) from rows and columns. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeField(c.header)).join(',');
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const value = c.value(row);
        return escapeField(value === null || value === undefined ? '' : String(value));
      })
      .join(','),
  );
  return [header, ...body].join('\r\n');
}

/**
 * Trigger a browser download of `csv` as `filename`.
 *
 * Returns false when there is no DOM to download into (e.g. SSR or a test
 * environment), so callers can surface a message instead of failing silently.
 */
export function downloadCsv(filename: string, csv: string): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false;
  }

  // The BOM makes Excel read the file as UTF-8 instead of the local codepage.
  // Written as an escape: a literal U+FEFF in source trips no-irregular-whitespace.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/** `verification-history-2026-09-29.csv` */
export function csvFilename(prefix: string, now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `${prefix}-${stamp}.csv`;
}
