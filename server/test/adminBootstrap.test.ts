import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import type * as databaseModule from '../db/database.js';
import type { BootstrapInputs, BootstrapResult } from '../services/adminBootstrap.js';

/**
 * Phase 1 — one-time ADMIN bootstrap.
 *
 * The security properties asserted here are the ones that matter in production:
 *   1. a first, authorized run creates exactly ONE ADMIN and nothing else;
 *   2. the password is bcrypt-hashed, never stored in clear;
 *   3. a second run is refused (the guard is one-time and durable);
 *   4. a missing, short, or wrong secret is refused, and a missing configured
 *      secret can never be satisfied by presenting an empty token;
 *   5. the one-time guard is checked AFTER the secret, so an unauthenticated
 *      caller cannot probe whether an administrator already exists;
 *   6. no secret, token, password, or hash is ever written to the log;
 *   7. self-registration over HTTP still cannot create a privileged role.
 *
 * NOTE ON CONCURRENCY: this file and integration.test.ts both `DROP SCHEMA
 * public CASCADE` in the same `*test*` database, so they cannot run against it
 * at the same time. `npm run test:server` therefore passes
 * `--test-concurrency=1` to run the files serially. If a new server suite is
 * added that resets the schema, keep that flag; give it a separate
 * `TEST_DATABASE_URL` if it needs to run in parallel.
 */

process.env.APP_ENV = 'test';
process.env.SEED_ON_BOOT = 'false'; // production-like: a fresh DB has zero users
process.env.DATA_MODE = 'demo';
process.env.JWT_SECRET = 'admin-bootstrap-test-secret-0123456789abcdef';

const RESOLVED_TEST_DB =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgres://localhost:5432/securex_test';
process.env.DATABASE_URL = RESOLVED_TEST_DB;

const TEST_DB_NAME = (() => {
  try {
    return new URL(RESOLVED_TEST_DB).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
})();
if (!/test/i.test(TEST_DB_NAME)) {
  throw new Error(
    `Refusing to run bootstrap tests against database "${TEST_DB_NAME}". ` +
      'Point DATABASE_URL or TEST_DATABASE_URL at a dedicated *test* database.',
  );
}

// A valid, >= 32 character secret. Never printed by this suite.
const SECRET = 'bootstrap-secret-tests-only-0123456789ABCDEF';
const EMAIL = 'bootstrap-admin@sp-net.in';
const NAME = 'Platform Administrator';
const PASSWORD = 'Str0ng-Bootstrap-Pass!2026';

function inputs(overrides: Partial<BootstrapInputs> = {}): BootstrapInputs {
  return { secret: SECRET, token: SECRET, email: EMAIL, name: NAME, password: PASSWORD, ...overrides };
}

function reasonOf(result: BootstrapResult): string {
  assert.equal(result.ok, false, 'expected a refusal');
  return (result as { reason: string }).reason;
}

let database: typeof databaseModule;
let closeDb: () => Promise<void>;
let bootstrapAdmin: (inputs?: BootstrapInputs) => Promise<BootstrapResult>;
let app: Express;

async function resetSchema(): Promise<void> {
  const client = new Client({ connectionString: RESOLVED_TEST_DB });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await client.end();
  }
}

async function userCount(): Promise<number> {
  const row = await database.get<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  return row?.n ?? 0;
}

before(async () => {
  database = await import('../db/database.js');
  closeDb = database.closeDb;
  ({ bootstrapAdmin } = await import('../services/adminBootstrap.js'));

  await resetSchema();
  await database.initDb();
  const { createApp } = await import('../app.js');
  app = createApp();
});

after(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetSchema();
  await database.initDb();
});

describe('one-time ADMIN bootstrap', () => {
  test('a fresh production database really does start with zero users', async () => {
    assert.equal(await userCount(), 0, 'SEED_ON_BOOT=false must leave a fresh database empty');
  });

  test('creates exactly one ADMIN on an authorized run', async () => {
    const result = await bootstrapAdmin(inputs());
    assert.equal(result.ok, true, JSON.stringify(result));

    const users = await database.all<{ id: string; email: string; role: string; status: string }>(
      'SELECT id, email, role, status FROM users',
    );
    assert.equal(users.length, 1, 'exactly one account may be created');
    const created = users[0];
    assert.ok(created, 'the created account must exist');
    assert.equal(created.role, 'ADMIN');
    assert.equal(created.email, EMAIL);
    assert.equal(created.status, 'ACTIVE');
  });

  test('never creates a second privileged role', async () => {
    await bootstrapAdmin(inputs());
    const roles = await database.all<{ role: string }>(
      `SELECT role FROM users WHERE role IN ('ADMIN','SECURITY_ADMIN','NETWORK_ADMIN','AUDITOR')`,
    );
    assert.equal(roles.length, 1, 'the bootstrap mints one administrator and nothing else');
    const sole = roles[0];
    assert.ok(sole, 'the administrator must exist');
    assert.equal(sole.role, 'ADMIN');
  });

  test('stores the password as a bcrypt hash, never in clear', async () => {
    const result = await bootstrapAdmin(inputs());
    assert.equal(result.ok, true);

    const row = await database.get<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      (result as { userId: string }).userId,
    );
    assert.ok(row);
    assert.match(row.password_hash, /^\$2[aby]\$\d{2}\$/, 'expected a bcrypt hash');
    assert.ok(!row.password_hash.includes(PASSWORD), 'the clear password must not be stored');
    assert.equal(bcrypt.compareSync(PASSWORD, row.password_hash), true, 'the hash must verify');
  });

  test('refuses a second run: the one-time guard is durable, not per-process', async () => {
    assert.equal((await bootstrapAdmin(inputs())).ok, true);

    const second = await bootstrapAdmin(inputs());
    assert.equal(reasonOf(second), 'ADMIN_ALREADY_EXISTS');

    const admins = await database.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN'`,
    );
    assert.equal(admins?.n, 1, 'a replayed secret must not mint a second administrator');
  });

  test('refuses a second run even after the admin is DISABLED', async () => {
    await bootstrapAdmin(inputs());
    await database.run(`UPDATE users SET status = 'DISABLED' WHERE role = 'ADMIN'`);

    const again = await bootstrapAdmin(inputs());
    assert.equal(reasonOf(again), 'ADMIN_ALREADY_EXISTS', 'the guard must not be side-stepped by disabling');
  });

  test('refuses when the configured secret is absent, even with an empty token', async () => {
    assert.equal(reasonOf(await bootstrapAdmin(inputs({ secret: '' }))), 'SECRET_NOT_CONFIGURED');
    assert.equal(reasonOf(await bootstrapAdmin(inputs({ secret: '', token: '' }))), 'SECRET_NOT_CONFIGURED');
    assert.equal(await userCount(), 0, 'no account may be created without a configured secret');
  });

  test('refuses a secret too short to be usable', async () => {
    const result = await bootstrapAdmin(inputs({ secret: 'too-short', token: 'too-short' }));
    assert.equal(reasonOf(result), 'SECRET_NOT_CONFIGURED');
    assert.equal(await userCount(), 0);
  });

  test('refuses a wrong or missing proof-of-possession token', async () => {
    const wrong = await bootstrapAdmin(inputs({ token: 'A-different-but-validly-long-secret-01' }));
    assert.equal(reasonOf(wrong), 'SECRET_MISMATCH');

    const missing = await bootstrapAdmin(inputs({ token: '' }));
    assert.equal(reasonOf(missing), 'SECRET_MISMATCH');

    assert.equal(await userCount(), 0, 'no account may be created without proof of the secret');
  });

  test('checks the one-time guard only AFTER the secret, so it cannot be probed', async () => {
    await bootstrapAdmin(inputs()); // provision the administrator

    // With the correct secret the caller learns the guard is closed...
    assert.equal(reasonOf(await bootstrapAdmin(inputs())), 'ADMIN_ALREADY_EXISTS');

    // ...but without it, the refusal is always SECRET_MISMATCH. An
    // unauthenticated caller cannot distinguish "no admin yet" from "admin
    // already exists", so the guard is not an information leak.
    const probe = await bootstrapAdmin(inputs({ token: 'wrong-token-but-long-enough-1234567890' }));
    assert.equal(reasonOf(probe), 'SECRET_MISMATCH');
  });

  test('validates the admin email and password before touching the database', async () => {
    assert.equal(reasonOf(await bootstrapAdmin(inputs({ email: 'not-an-email' }))), 'EMAIL_INVALID');
    assert.equal(reasonOf(await bootstrapAdmin(inputs({ email: '' }))), 'CREDENTIALS_INCOMPLETE');
    assert.equal(reasonOf(await bootstrapAdmin(inputs({ name: '' }))), 'CREDENTIALS_INCOMPLETE');
    assert.equal(reasonOf(await bootstrapAdmin(inputs({ password: 'short' }))), 'PASSWORD_TOO_WEAK');
    assert.equal(
      reasonOf(await bootstrapAdmin(inputs({ password: 'x'.repeat(129) }))),
      'PASSWORD_TOO_WEAK',
    );

    assert.equal(await userCount(), 0, 'an invalid request must not create anything');
  });

  test('refuses to reuse an email that already belongs to a non-admin account', async () => {
    await database.run(
      `INSERT INTO users (id, email, name, role, institution_id, password_hash, status, mfa_enabled, created_at, last_login_at)
       VALUES ('usr-existing', ?, 'Existing Holder', 'HOLDER', NULL, 'x', 'ACTIVE', 0, '2026-01-01T00:00:00.000Z', NULL)`,
      'Holder@sp-net.in',
    );

    // Case-insensitive collision, as emails are compared case-insensitively.
    const result = await bootstrapAdmin(inputs({ email: 'holder@SP-NET.in' }));
    assert.equal(reasonOf(result), 'EMAIL_ALREADY_EXISTS');
    assert.equal(await userCount(), 1, 'the existing account must be untouched');
  });

  test('the bootstrapped admin can authenticate through the real login route', async () => {
    await bootstrapAdmin(inputs());
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.user.role, 'ADMIN');
    assert.ok(res.body.data.token, 'a session token is issued');
  });

  test('the bootstrapped admin reaches a privileged route with that token', async () => {
    await bootstrapAdmin(inputs());
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    assert.notEqual(res.status, 401, 'the ADMIN session must be accepted by an admin-only route');
  });

  test('self-registration still cannot create a privileged role', async () => {
    for (const role of ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR']) {
      const res = await request(app).post('/api/auth/register').send({
        email: `escalate-${role.toLowerCase()}@example.com`,
        name: 'Escalation Attempt',
        password: PASSWORD,
        role,
      });
      // Either the role is rejected outright, or it is coerced to a public role.
      if (res.status < 400) {
        assert.notEqual(res.body?.data?.user?.role, role, `registration must never yield ${role}`);
      }
    }

    const privileged = await database.all<{ role: string }>(
      `SELECT role FROM users WHERE role IN ('ADMIN','SECURITY_ADMIN','NETWORK_ADMIN','AUDITOR')`,
    );
    assert.equal(privileged.length, 0, 'no privileged account may be created over HTTP');
  });

  test('no secret, token, password, or hash is ever written to stdout/stderr', async () => {
    const written: string[] = [];
    const stdout = process.stdout.write.bind(process.stdout);
    const stderr = process.stderr.write.bind(process.stderr);
    (process.stdout as unknown as { write: unknown }).write = (chunk: unknown, ...rest: unknown[]) => {
      written.push(String(chunk));
      return (stdout as (...a: unknown[]) => boolean)(chunk, ...rest);
    };
    (process.stderr as unknown as { write: unknown }).write = (chunk: unknown, ...rest: unknown[]) => {
      written.push(String(chunk));
      return (stderr as (...a: unknown[]) => boolean)(chunk, ...rest);
    };

    try {
      await bootstrapAdmin(inputs());
      await bootstrapAdmin(inputs({ token: 'a-wrong-token-value-that-is-long-enough-00' }));
    } finally {
      (process.stdout as unknown as { write: unknown }).write = stdout;
      (process.stderr as unknown as { write: unknown }).write = stderr;
    }

    const output = written.join('\n');
    for (const forbidden of [SECRET, PASSWORD, SECRET.slice(0, 16), PASSWORD.slice(0, 8)]) {
      assert.ok(!output.includes(forbidden), 'sensitive bootstrap material must never be logged');
    }
  });
});
