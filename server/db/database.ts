import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { serverConfig } from '../config.js';
import { logger } from '../services/logger.js';
import { seedIfEmpty } from './seed.js';

export type Row = Record<string, unknown>;
export type SqlValue = SQLInputValue | undefined;

function normalize(value: SqlValue): SQLInputValue {
  return value === undefined ? null : value;
}

/**
 * SQLite persistence via Node's built-in `node:sqlite` (stable on Node 22+).
 * The whole Node runtime is the app server, so a synchronous, single-connection
 * adapter keeps the API deterministic with zero native-compilation risk.
 */
let db: DatabaseSync | null = null;

function ensureDataDir(): void {
  try {
    mkdirSync(dirname(serverConfig.dbPath), { recursive: true });
  } catch {
    // Directory creation is best-effort; opening the DB below will surface errors.
  }
}

export function getDb(): DatabaseSync {
  if (db) return db;
  ensureDataDir();
  db = new DatabaseSync(serverConfig.dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  logger.info('db.opened', { target: serverConfig.dbPath });
  return db;
}

export function applySchema(): void {
  const d = getDb();
  const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  d.exec(sql);
}

export function all<T = Row>(sql: string, ...params: SqlValue[]): T[] {
  return getDb().prepare(sql).all(...(params.map(normalize) as SQLInputValue[])) as T[];
}

export function get<T = Row>(sql: string, ...params: SqlValue[]): T | undefined {
  return getDb().prepare(sql).get(...(params.map(normalize) as SQLInputValue[])) as T | undefined;
}

export function run(sql: string, ...params: SqlValue[]): void {
  getDb().prepare(sql).run(...(params.map(normalize) as SQLInputValue[]));
}

export function transaction<T>(fn: () => T): T {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const result = fn();
    d.exec('COMMIT');
    return result;
  } catch (err) {
    d.exec('ROLLBACK');
    throw err;
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Create tables then seed canonical demo data if this is a fresh database. */
export function initDb(): void {
  applySchema();
  const meta = get<Row>('SELECT value FROM schema_meta WHERE key = ?', 'seeded');
  if (serverConfig.seedOnBoot && !meta) {
    seedIfEmpty();
  }
  logger.info('db.ready', { dataMode: serverConfig.dataMode, seeded: Boolean(meta ?? false) });
}