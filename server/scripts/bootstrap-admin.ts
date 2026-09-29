/**
 * One-time production ADMIN bootstrap.
 *
 *   npm run bootstrap:admin
 *
 * Creates exactly one ADMIN account, then refuses on every subsequent run.
 *
 * Why a CLI and not an HTTP endpoint: a route would be reachable by anything
 * that can reach the API, and a bootstrap endpoint is a standing invitation to
 * privilege escalation. A CLI has no listening socket, no route to probe, and no
 * attack surface at all — it only runs when a human with shell access to the
 * service executes it.
 *
 * Required environment (see docs/deployment-render.md):
 *   DATABASE_URL              Render PostgreSQL connection string
 *   APP_ENV=production        so the normal production guards apply
 *   BOOTSTRAP_ADMIN_SECRET    >= 32 chars, stored in the service environment
 *   BOOTSTRAP_ADMIN_TOKEN     proof of possession; must equal the secret
 *   BOOTSTRAP_ADMIN_EMAIL     the admin's login email
 *   BOOTSTRAP_ADMIN_NAME      the admin's display name
 *   BOOTSTRAP_ADMIN_PASSWORD  the admin's password (hashed with bcrypt)
 *
 * The password is read from the environment, never from argv: process arguments
 * are visible to anyone who can list processes.
 *
 * The command applies the (idempotent) schema first, exactly as the server does
 * on boot, so it works against a completely fresh database.
 *
 * Exit codes: 0 on success, 1 on any refusal. Nothing is printed except the
 * outcome, the created identity, and a reminder to unset the variables.
 */

import { initDb, closeDb } from '../db/database.js';
import { bootstrapAdmin } from '../services/adminBootstrap.js';
import { logger } from '../services/logger.js';

async function main(): Promise<number> {
  let outcome: number;
  try {
    // Same idempotent schema application as server boot. A fresh production
    // database has no tables at all, so this is required before the insert.
    await initDb();

    const result = await bootstrapAdmin();
    if (result.ok) {
      logger.info('admin.bootstrap_success', {
        userId: result.userId,
        email: result.email,
        role: 'ADMIN',
      });
      process.stdout.write(
        `\n  SecureX: initial ADMIN created.\n` +
          `    id    ${result.userId}\n` +
          `    email ${result.email}\n\n` +
          `  Sign in at the app with that email and the password you supplied via\n` +
          `  BOOTSTRAP_ADMIN_PASSWORD. Then REMOVE BOOTSTRAP_ADMIN_TOKEN,\n` +
          `  BOOTSTRAP_ADMIN_SECRET and BOOTSTRAP_ADMIN_PASSWORD from the service\n` +
          `  environment — the one-time guard already prevents a second bootstrap,\n` +
          `  but the credentials should not sit in the environment afterwards.\n\n`,
      );
      outcome = 0;
    } else {
      process.stderr.write(`\n  SecureX: bootstrap refused (${result.reason}).\n    ${result.message}\n\n`);
      outcome = 1;
    }
  } catch (err) {
    // Deliberately terse: never echo connection strings or stack detail that
    // could carry a password. The full error is already logged by the caller.
    process.stderr.write(
      `\n  SecureX: bootstrap failed to run: ${
        err instanceof Error ? err.message : 'unknown error'
      }\n\n`,
    );
    outcome = 1;
  } finally {
    await closeDb();
  }
  return outcome;
}

process.exitCode = await main();
