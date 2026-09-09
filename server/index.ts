import { createApp } from './app.js';
import { serverConfig } from './config.js';
import { closeDb, initDb } from './db/database.js';
import { logger } from './services/logger.js';

// Boot: create the (idempotent) schema and seed canonical demo data on first run.
initDb();

const app = createApp();
const server = app.listen(serverConfig.port, serverConfig.host, () => {
  logger.info('http.listening', {
    host: serverConfig.host,
    port: serverConfig.port,
    environment: serverConfig.environment,
    dataMode: serverConfig.dataMode,
  });
});

function shutdown(signal: string): void {
  logger.info('http.shutdown', { signal });
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  // If connections refuse to drain, exit after a brief grace period.
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));