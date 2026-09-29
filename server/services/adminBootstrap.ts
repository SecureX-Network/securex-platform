import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { serverConfig } from '../config.js';
import { get, run, transaction } from '../db/database.js';
import { logger } from '../services/logger.js';
import { entityId, nowIso } from '../utils/ids.js';

/**
 * One-time production ADMIN bootstrap.
 *
 * WHY THIS EXISTS
 * Production runs with `SEED_ON_BOOT=false`, so a fresh database has zero
 * users. Public registration deliberately allows only
 * HOLDER|INSTITUTION|ISSUER|EMPLOYER, so there is otherwise no way to create
 * the first administrator. This module is that way — and nothing else is.
 *
 * DESIGN CONSTRAINTS
 *  - SERVER-SIDE ONLY. It is a CLI command (`npm run bootstrap:admin`), never an
 *    HTTP route. There is no endpoint to probe, no open `/register-admin`, and
 *    nothing reachable from the browser, so it cannot be attacked remotely.
 *  - SECRET-GATED. The operator supplies `BOOTSTRAP_ADMIN_TOKEN` when running
 *    the command, and it must match the `BOOTSTRAP_ADMIN_SECRET` held in the
 *    service environment. The comparison is constant-time and the value is
 *    never logged, echoed, or returned.
 *  - ONE-TIME. Refuses if ANY ADMIN already exists, so a leaked secret cannot be
 *    replayed to mint a second administrator later.
 *  - EXACTLY ONE ACCOUNT, EXACTLY ONE ROLE. It creates a single ADMIN and never
 *    SECURITY_ADMIN / NETWORK_ADMIN / AUDITOR.
 *  - IDEMPOTENT-SAFE. Re-running after success is a no-op refusal, not a
 *    duplicate insert and not a crash.
 *  - HASHED with the same bcrypt mechanism (and cost) as every other password.
 *  - The admin password is never read from argv (argv is world-visible in `ps`
 *    and in Render's process listing); it comes from the environment.
 */

/** Why a bootstrap attempt was refused. Returned instead of thrown, for clean exits. */
export type BootstrapRefusal =
  | 'SECRET_NOT_CONFIGURED'
  | 'SECRET_MISMATCH'
  | 'CREDENTIALS_INCOMPLETE'
  | 'EMAIL_INVALID'
  | 'PASSWORD_TOO_WEAK'
  | 'ADMIN_ALREADY_EXISTS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'UNEXPECTED';

export type BootstrapResult =
  | { ok: true; userId: string; email: string; created: true }
  | { ok: false; reason: BootstrapRefusal; message: string };

/**
 * Minimum bootstrap secret length. Mirrors the JWT secret policy in
 * server/config.ts (>= 32) so the two deployment secrets share one standard.
 */
export const MIN_BOOTSTRAP_SECRET_LENGTH = 32;

/** Mirrors the password policy in the registration validator (min 8, max 128). */
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Constant-time string comparison.
 *
 * `timingSafeEqual` requires equal-length buffers, so a length mismatch is
 * compared against itself first: that keeps the failure path's cost close to the
 * success path's, and the boolean result is still derived from the real check
 * rather than returned early.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** True when at least one administrator already exists, whatever its status. */
async function adminExists(): Promise<boolean> {
  // Deliberately counts admins of any status: "an administrator has already been
  // provisioned" is the stop condition, so the one-time guard cannot be
  // side-stepped by first disabling the existing account.
  const row = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM users WHERE role = ?`, 'ADMIN');
  return Boolean(row && row.n > 0);
}

class BootstrapAbort extends Error {
  constructor(readonly reason: BootstrapRefusal, message: string) {
    super(message);
  }
}

/** The five values a bootstrap run depends on. */
export interface BootstrapInputs {
  /** The secret held in the service environment. */
  secret: string;
  /** Proof-of-possession supplied by the operator running the command. */
  token: string;
  email: string;
  name: string;
  password: string;
}

/** The inputs as they arrive from the environment, via serverConfig. */
function inputsFromConfig(): BootstrapInputs {
  return {
    secret: serverConfig.bootstrapAdminSecret,
    token: process.env.BOOTSTRAP_ADMIN_TOKEN ?? '',
    email: serverConfig.bootstrapAdminEmail,
    name: serverConfig.bootstrapAdminName,
    password: serverConfig.bootstrapAdminPassword,
  };
}

/**
 * Create the initial production administrator, or refuse.
 *
 * Defaults to the BOOTSTRAP_ADMIN_* environment variables (via serverConfig);
 * `inputs` exists so the decision logic can be tested against every refusal
 * without mutating process-wide state. The CLI never passes it.
 *
 * Never throws for an expected refusal, and never logs a secret or password.
 */
export async function bootstrapAdmin(inputs: BootstrapInputs = inputsFromConfig()): Promise<BootstrapResult> {
  const { secret, token, email: rawEmail, name: rawName, password } = inputs;

  try {
    // 1. The configured secret must exist and be strong. Without this check a
    //    deployment that never set one would accept an empty presented token.
    if (!secret) {
      throw new BootstrapAbort(
        'SECRET_NOT_CONFIGURED',
        'BOOTSTRAP_ADMIN_SECRET is not set. Generate a strong value (>= 32 characters) in the ' +
          'service environment before running the bootstrap.',
      );
    }
    if (secret.length < MIN_BOOTSTRAP_SECRET_LENGTH) {
      throw new BootstrapAbort(
        'SECRET_NOT_CONFIGURED',
        `BOOTSTRAP_ADMIN_SECRET must be at least ${MIN_BOOTSTRAP_SECRET_LENGTH} characters.`,
      );
    }

    // 2. The admin's own credentials must be complete and valid.
    if (!rawEmail || !rawName || !password) {
      throw new BootstrapAbort(
        'CREDENTIALS_INCOMPLETE',
        'BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME and BOOTSTRAP_ADMIN_PASSWORD must all be set.',
      );
    }

    const email = rawEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BootstrapAbort('EMAIL_INVALID', 'BOOTSTRAP_ADMIN_EMAIL is not a valid email address.');
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      throw new BootstrapAbort(
        'PASSWORD_TOO_WEAK',
        `BOOTSTRAP_ADMIN_PASSWORD must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
      );
    }

    // 3. The operator must actually prove possession of the secret.
    if (!token || !secretsMatch(token, secret)) {
      // Logged without the value, ever.
      logger.warn('admin.bootstrap_rejected', { reason: 'SECRET_MISMATCH' });
      throw new BootstrapAbort(
        'SECRET_MISMATCH',
        'The supplied BOOTSTRAP_ADMIN_TOKEN does not match BOOTSTRAP_ADMIN_SECRET.',
      );
    }

    // 4. One-time guard, checked AFTER the secret so an unauthenticated caller
    //    learns nothing about whether an administrator already exists.
    if (await adminExists()) {
      logger.warn('admin.bootstrap_rejected', { reason: 'ADMIN_ALREADY_EXISTS' });
      throw new BootstrapAbort(
        'ADMIN_ALREADY_EXISTS',
        'An ADMIN account already exists. The one-time bootstrap has already been used; ' +
          'create any further administrators from the admin UI instead.',
      );
    }

    const existingEmail = await get<{ id: string }>(
      'SELECT id FROM users WHERE lower(email) = lower(?)',
      email,
    );
    if (existingEmail) {
      throw new BootstrapAbort(
        'EMAIL_ALREADY_EXISTS',
        'An account already exists for BOOTSTRAP_ADMIN_EMAIL.',
      );
    }

    // 5. Create exactly one ADMIN, using the same bcrypt mechanism and cost as
    //    every other password path. The hash is never logged or returned.
    const userId = entityId('usr');
    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      await transaction(async () => {
        // Re-check inside the transaction so two concurrent bootstrap runs
        // cannot both pass the guard above.
        if (await adminExists()) {
          throw new BootstrapAbort(
            'ADMIN_ALREADY_EXISTS',
            'An ADMIN account already exists. The one-time bootstrap has already been used.',
          );
        }
        await run(
          `INSERT INTO users (id, email, name, role, institution_id, password_hash, status, mfa_enabled, created_at, last_login_at)
           VALUES (?, ?, ?, 'ADMIN', NULL, ?, 'ACTIVE', 0, ?, NULL)`,
          userId,
          email,
          rawName.trim(),
          passwordHash,
          nowIso(),
        );
        await run(
          `INSERT INTO schema_meta (key, value) VALUES ('admin_bootstrap', ?)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          nowIso(),
        );
      });
    } catch (err) {
      if (err instanceof BootstrapAbort) throw err;
      return {
        ok: false,
        reason: 'UNEXPECTED',
        message: 'The bootstrap could not complete. See the server log for the underlying database error.',
      };
    }

    // Success. Log the identity created — never the password or the secret.
    logger.info('admin.bootstrap_created', { userId, email, role: 'ADMIN' });
    return { ok: true, userId, email, created: true };
  } catch (err) {
    if (err instanceof BootstrapAbort) {
      return { ok: false, reason: err.reason, message: err.message };
    }
    return {
      ok: false,
      reason: 'UNEXPECTED',
      message: 'The bootstrap could not complete. See the server log for the underlying error.',
    };
  }
}
