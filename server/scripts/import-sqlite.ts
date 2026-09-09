#!/usr/bin/env node
/**
 * One-shot migration utility: copy an existing SecureX SQLite database
 * (produced by the previous node:sqlite Platform API) into a target
 * PostgreSQL database, preserving row identities, timestamps, and public
 * credential IDs.
 *
 * The Platform API's canonical fresh deploy path is schema + deterministic
 * seed; this importer exists for teams that already ran an instance with
 * real data and want a faithful lift-and-shift.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/securex \
 *     npm run import:sqlite -- <source.sqlite> [--force]
 *
 * Refuses to run if the target already contains users (use --force only
 * against a known-empty/throwaway database).
 */
import { DatabaseSync } from 'node:sqlite';
import { Client } from 'pg';

const args = process.argv.slice(2);
const sourcePath = args.find((a) => !a.startsWith('--')) ?? process.env.SQLITE_SOURCE;
const force = args.includes('--force');
const targetUrl = process.env.DATABASE_URL;

// FK-safe dependency order (issuers -> institutions, credentials -> issuers).
const TABLE_ORDER = [
  'institutions',
  'users',
  'issuers',
  'credentials',
  'blocks',
  'transactions',
  'verification_history',
  'risk_assessments',
  'security_alerts',
  'audit_events',
  'sessions',
  'schema_meta',
];

const REQUIRED_TABLES = new Set([
  'users',
  'institutions',
  'issuers',
  'credentials',
  'blocks',
  'sessions',
]);

function sqliteValue(value: unknown): unknown {
  return value === undefined || value === null ? null : value;
}

async function main(): Promise<void> {
  if (!sourcePath) {
    console.error('ERROR: missing source SQLite file. Pass it as the first argument (or set SQLITE_SOURCE).');
    throw new Error('missing source SQLite file');
  }
  if (!targetUrl) {
    console.error('ERROR: DATABASE_URL is required (the target PostgreSQL connection).');
    throw new Error('DATABASE_URL is required');
  }

  const source = new DatabaseSync(sourcePath, { readOnly: true });
  const client = new Client({ connectionString: targetUrl });
  await client.connect();

  try {
    const sourceTables = source
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => r.name as string)
      .filter((t) => !t.startsWith('sqlite_'));
    const missing = [...REQUIRED_TABLES].filter((t) => !sourceTables.includes(t));
    if (missing.length > 0) {
      throw new Error(`source SQLite database is missing required tables: ${missing.join(', ')}`);
    }

    if (!force) {
      let existing = 0;
      try {
        const res = await client.query('SELECT COUNT(*) AS n FROM users');
        existing = Number(res.rows[0]?.n ?? 0);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code !== '42P01') {
          // 42P01 = undefined_table; anything else is a real connection/schema issue.
          throw err;
        }
      }
      if (existing > 0) {
        throw new Error(
          `target database already has ${existing} users. Refusing to import over live data. ` +
          'Point DATABASE_URL at an empty database, or pass --force against a known-throwaway target.',
        );
      }
    }

    await client.query('BEGIN');
    const counts: Record<string, number> = {};
    for (const table of TABLE_ORDER) {
      const stmt = source.prepare(`SELECT * FROM ${table}`);
      const columns = stmt.columns().map((c) => c.name);
      const rows = stmt.all();
      if (rows.length === 0) {
        counts[table] = 0;
        continue;
      }
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const insert = `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
      for (const row of rows) {
        await client.query(insert, columns.map((c) => sqliteValue(row[c])));
      }
      counts[table] = rows.length;
    }
    await client.query('COMMIT');
    console.log('Import complete:');
    for (const [table, n] of Object.entries(counts)) {
      console.log(`  ${table}: ${n}`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('ERROR: import failed.', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
    source.close();
  }
}

void main();