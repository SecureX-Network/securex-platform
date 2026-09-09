/**
 * Minimal structured logger. Never logs bodies, tokens, hashes, or secrets.
 */
type Meta = Record<string, unknown>;

function line(level: string, event: string, meta?: Meta): void {
  const base = `[securex-api] ${new Date().toISOString()} ${level} ${event}`;
  const suffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  console.log(base + suffix);
}

export const logger = {
  info: (event: string, meta?: Meta) => line('info', event, meta),
  warn: (event: string, meta?: Meta) => line('warn', event, meta),
  error: (event: string, meta?: Meta) => line('error', event, meta),
};