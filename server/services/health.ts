import { serverConfig } from '../config.js';
import { getPool } from '../db/database.js';

/**
 * Single source of truth for API health.
 *
 * Both `GET /api/health` (machine-readable) and `GET /` (human-readable status
 * page) render from `getHealthPayload()`, so the JSON contract and the status
 * page can never drift apart or disagree about whether the database is up.
 *
 * The payload deliberately carries only non-sensitive operational facts. It
 * must never expose the connection string, host, credentials, or any user data.
 */
export type DatabaseHealth = 'connected' | 'unavailable';

export interface HealthPayload {
  status: 'ok';
  service: 'securex-platform-api';
  version: string;
  time: string;
  dataMode: 'real' | 'demo';
  database: DatabaseHealth;
}

/** Cheap liveness probe: one trivial round trip, bounded so a hung pool cannot stall a request. */
export async function probeDatabase(): Promise<DatabaseHealth> {
  try {
    await Promise.race([
      getPool().query('SELECT 1'),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error('health probe timeout')), 1500).unref(),
      ),
    ]);
    return 'connected';
  } catch {
    return 'unavailable';
  }
}

export async function getHealthPayload(): Promise<HealthPayload> {
  return {
    status: 'ok',
    service: 'securex-platform-api',
    version: serverConfig.apiVersion,
    time: new Date().toISOString(),
    dataMode: serverConfig.dataMode,
    database: await probeDatabase(),
  };
}
