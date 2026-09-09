import { readFileSync } from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg, { type Pool, type PoolClient } from 'pg';
import { serverConfig } from '../config.js';
import { logger } from '../services/logger.js';
import { seedIfEmpty } from './seed.js';

export type Row = Record<string, unknown>;
export type SqlValue = string | number | null | boolean | object | undefined;

// int8 (bigint) -> number so COUNT(), MAX(), etc. keep the numeric semantics
// the REST contract expects (SQLite returns numbers; pg returns bigints as
// strings by default). Scalar int8 columns do not exist in the schema.
pg.types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

function normalize(value: SqlValue): unknown {
  return value === undefined ? null : value;
}

/**
 * PostgreSQL persistence via node-postgres. The whole Node runtime is the app
 * server, so a connection pool with a thin async wrapper (all/get/run and a
 * transaction helper) keeps the API deterministic while staying dependency-free.
 *
 * Public SQL fragments use the same `?` placeholders as the SQLite adapter;
 * they are renumbered to PG's `$1..$n` positional style before execution.
 */
let pool: Pool | null = null;

/** Client bound to the enclosing transaction, if any (transaction() scope only). */
const currentTx = new AsyncLocalStorage<PoolClient>();

function translate(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

function activeStore(): Pool | PoolClient {
  return currentTx.getStore() ?? getPool();
}

/** Lazily-created shared pool. Creating a Pool never blocks; queries connect. */
export function getPool(): Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: serverConfig.databaseUrl,
      max: serverConfig.databasePoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (err) => {
      logger.error('db.pool_error', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    logger.info('db.opened', { database: describeDatabase(serverConfig.databaseUrl) });
  }
  return pool;
}

/**
 * Log a DATABASE_URL without ever leaking credentials: only the resolved
 * host and database name (no user, no password, no query params).
 */
export function describeDatabase(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const host = url.hostname || 'localhost';
    const database = url.pathname.replace(/^\//, '');
    return `${host}/${database}`;
  } catch {
    return 'postgres';
  }
}

export async function applySchema(): Promise<void> {
  const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await getPool().query(sql);
}

export async function all<T = Row>(sql: string, ...params: SqlValue[]): Promise<T[]> {
  const res = await activeStore().query(translate(sql), params.map(normalize));
  return res.rows as T[];
}

export async function get<T = Row>(sql: string, ...params: SqlValue[]): Promise<T | undefined> {
  const res = await activeStore().query(translate(sql), params.map(normalize));
  return res.rows[0] as T | undefined;
}

export async function run(sql: string, ...params: SqlValue[]): Promise<void> {
  await activeStore().query(translate(sql), params.map(normalize));
}

/**
 * Run `fn` inside a single PG transaction. `all`/`get`/`run` called inside
 * `fn` automatically use the transaction's dedicated connection. The callback
 * may be async; the connection is always returned to the pool.
 */
export async function transaction<T>(fn: () => Promise<T> | T): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await currentTx.run(client, async () => fn());
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback failures are best-effort; surface the original error.
    }
    throw err;
  } finally {
    currentTx.disable();
    client.release();
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Create tables then seed canonical demo data if this is a fresh database. */
export async function initDb(): Promise<void> {
  await applySchema();
  const meta = await get<Row>('SELECT value FROM schema_meta WHERE key = ?', 'seeded');
  let seeded = false;
  if (serverConfig.seedOnBoot && !meta) {
    await seedIfEmpty();
    seeded = true;
  }
  logger.info('db.ready', { dataMode: serverConfig.dataMode, seeded });
}