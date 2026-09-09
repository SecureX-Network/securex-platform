import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import request from 'supertest';
import type { Express } from 'express';
import type * as databaseModule from '../db/database.js';

process.env.APP_ENV = 'test';
process.env.SEED_ON_BOOT = 'true';
process.env.DATA_MODE = 'demo';
process.env.JWT_SECRET = 'integration-test-secret-0123456789abcdef-tests-only';

// Resolve the integration-test database and pin DATABASE_URL to it so the
// app, the schema, and the seed all use exactly the database being tested.
const RESOLVED_TEST_DB = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/securex_test';
process.env.DATABASE_URL = RESOLVED_TEST_DB;

// Safety rail: never run the integration suite against anything that is not
// clearly a test database.
const TEST_DB_NAME = (() => {
  try {
    return new URL(RESOLVED_TEST_DB).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
})();
if (!/test/i.test(TEST_DB_NAME)) {
  throw new Error(
    `Refusing to run integration tests against database "${TEST_DB_NAME}". ` +
    'Point DATABASE_URL or TEST_DATABASE_URL at a dedicated *test* database (e.g. securex_test).',
  );
}

let app: Express;
let closeDb: () => Promise<void>;
let database: typeof databaseModule;

before(async () => {
  // Deterministic baseline: wipe the public schema, then let initDb re-create
  // the schema and re-seed canonical demo data.
  const reset = new Client({ connectionString: RESOLVED_TEST_DB });
  await reset.connect();
  try {
    await reset.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await reset.end();
  }

  database = await import('../db/database.js');
  closeDb = database.closeDb;
  await database.initDb();
  const { createApp: appFactory } = await import('../app.js');
  app = appFactory();
});

after(async () => {
  await closeDb();
});

interface LoginResponse {
  success: boolean;
  data: { user: { id: string; email: string; name: string; role: string }; token: string };
}

async function login(email: string, role?: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password123!', ...(role ? { role } : {}) });
  return res.body as LoginResponse;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('SecureX Platform API integration', () => {
  test('health endpoint', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'ok');
  });

  test('login succeeds with seeded demo account', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@securex.io', password: 'Password123!' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'ADMIN');
    assert.ok(res.body.data.token.length > 20);
  });

  test('login rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@securex.io', password: 'wrong-password' });
    assert.equal(res.status, 401);
    assert.equal(res.body.errorCode, 'INVALID_CREDENTIALS');
  });

  test('login enforces role filter', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@securex.io', password: 'Password123!', role: 'HOLDER' });
    assert.equal(res.status, 403);
  });

  test('auth/me returns the authenticated user', async () => {
    const { data } = await login('admin@securex.io');
    const res = await request(app).get('/api/auth/me').set(bearer(data.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'admin@securex.io');
  });

  test('protected routes reject missing tokens', async () => {
    const res = await request(app).get('/api/admin/stats');
    assert.equal(res.status, 401);
  });

  test('register creates an authenticated session', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Holder', email: 'test.holder@example.com', password: 'Password123!', role: 'HOLDER' });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.user);
    assert.ok(res.body.data.token);

    const me = await request(app).get('/api/auth/me').set(bearer(res.body.data.token));
    assert.equal(me.body.data.email, 'test.holder@example.com');
  });

  test('register rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'admin@securex.io', password: 'Password123!', role: 'HOLDER' });
    assert.equal(res.status, 409);
    assert.equal(res.body.errorCode, 'EMAIL_TAKEN');
  });

  test('institution list matches seeded domain data', async () => {
    const res = await request(app).get('/api/institutions');
    assert.equal(res.status, 200);
    const institutions = res.body.data as Array<{ id: string; name: string; verified: boolean }>;
    assert.equal(institutions.length, 10);
    assert.ok(institutions.some((i) => i.id === 'inst-stanford' && i.name === 'Stanford University'));
  });

  test('institution stats aggregate from credentials', async () => {
    const res = await request(app).get('/api/institutions/inst-stanford/stats');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.totalCredentials > 0);
    assert.ok(Array.isArray(res.body.data.recentActivity));
  });

  test('credentials list requires auth and returns seeded credentials', async () => {
    const { data } = await login('emily.rodriguez@example.com');
    const res = await request(app).get('/api/credentials').set(bearer(data.token));
    assert.equal(res.status, 200);
    const creds = res.body.data as Array<{ credentialId: string; status: string }>;
    assert.equal(creds.length, 15);
    assert.ok(creds.some((c) => c.credentialId === 'SX-EF4B-390A-7C58' && c.status === 'TAMPERED'));
  });

  test('credentials can be filtered by holder', async () => {
    const { data } = await login('emily.rodriguez@example.com');
    const res = await request(app)
      .get('/api/credentials?holderId=usr-holder-001')
      .set(bearer(data.token));
    const creds = res.body.data as Array<{ holderId: string }>;
    assert.ok(creds.length > 0);
    assert.ok(creds.every((c) => c.holderId === 'usr-holder-001'));
  });

  test('verifications resolve a public credential ID', async () => {
    const res = await request(app).get('/api/verifications?credentialId=SX-2F9C-A41B-8D7E');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'VALID');
    assert.equal(res.body.data.credential.credentialId, 'SX-2F9C-A41B-8D7E');
    assert.equal(res.body.data.blockchainProof.verified, true);
  });

  test('verifications report NOT_FOUND for unknown IDs', async () => {
    const res = await request(app).get('/api/verifications?credentialId=SX-0000-0000-0000');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'NOT_FOUND');
    assert.equal(res.body.data.blockchainProof.verified, false);
  });

  test('wallet-shared public credential IDs resolve on the platform', async () => {
    const res = await request(app).get('/api/verifications?credentialId=SX-7A31-C0E4-19F6');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'VALID');
    assert.equal(res.body.data.credential.credentialId, 'SX-7A31-C0E4-19F6');
  });

  test('VerifyPage sample credentials all resolve on the platform', async () => {
    const samples: Array<[string, string]> = [
      ['SX-2F9C-A41B-8D7E', 'VALID'],
      ['SX-4B8D-6A2F-C701', 'VALID'],
      ['SX-9C4E-2D80-5A31', 'VALID'],
      ['SX-5A40-9F61-D2B7', 'REVOKED'],
    ];
    for (const [id, expected] of samples) {
      const res = await request(app).get(`/api/verifications?credentialId=${id}`);
      assert.equal(res.status, 200, `sample ${id} should return 200`);
      assert.equal(res.body.data.status, expected, `sample ${id} should be ${expected}`);
      assert.equal(res.body.data.credential.credentialId, id);
    }
  });

  test('verifications with a matching document hash report EXACT', async () => {
    const { data } = await login('admin@securex.io');
    const cred = await request(app)
      .get('/api/credentials/SX-2F9C-A41B-8D7E')
      .set(bearer(data.token));
    const anchored = cred.body.data.merkleRoot as string;
    const res = await request(app)
      .get(`/api/verifications?credentialId=SX-2F9C-A41B-8D7E&hash=${anchored}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.documentHashCheck.status, 'EXACT');
    assert.equal(res.body.data.documentHashCheck.hashMatch, true);
    assert.equal(res.body.data.signatureVerification.valid, true);
  });

  test('verifications with a mismatched document hash flag a tamper check', async () => {
    const res = await request(app)
      .get(`/api/verifications?credentialId=SX-2F9C-A41B-8D7E&hash=${'f'.repeat(64)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.documentHashCheck.status, 'TAMPERED');
    assert.equal(res.body.data.documentHashCheck.hashMatch, false);
    assert.equal(res.body.data.signatureVerification.valid, false);
    assert.ok(res.body.data.fraudCheck.flags.some(
      (f: string) => f.indexOf('hash verification failed') !== -1 || f.indexOf('Hash verification failed') !== -1,
    ));
  });

  test('verifications reject a malformed document hash', async () => {
    const res = await request(app)
      .get('/api/verifications?credentialId=SX-2F9C-A41B-8D7E&hash=notahexhash');
    assert.equal(res.status, 400);
    assert.equal(res.body.errorCode, 'INVALID_HASH_FORMAT');
  });

  test('verification history lists seeded records', async () => {
    const res = await request(app).get('/api/verifications/history?employerId=marcus.johnson@acme.com');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 6);
  });

  test('block pagination matches shared explorer contract', async () => {
    const res = await request(app).get('/api/blocks?page=1&pageSize=10');
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.total, 22);
    assert.equal(res.body.data.data.length, 10);
    assert.equal(res.body.data.pageSize, 10);
  });

  test('single block by height', async () => {
    const res = await request(app).get('/api/blocks/1');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.hash.length === 64);
  });

  test('transactions pagination', async () => {
    const res = await request(app).get('/api/transactions?page=1&pageSize=12');
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.data.length, 12);
    assert.ok(res.body.data.total >= 34);
  });

  test('network stats reflect the local ledger', async () => {
    const res = await request(app).get('/api/network/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.lastBlockHeight, 22);
    assert.equal(res.body.data.networkStatus, 'HEALTHY');
  });

  test('admin stats', async () => {
    const { data } = await login('admin@securex.io');
    const res = await request(app).get('/api/admin/stats').set(bearer(data.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.totalCredentials, 15);
    assert.ok(Array.isArray(res.body.data.registeredThisMonth));
  });

  test('admin institutions list', async () => {
    const { data } = await login('admin@securex.io');
    const res = await request(app).get('/api/admin/institutions').set(bearer(data.token));
    assert.equal(res.body.data.length, 10);
  });

  test('admin users list strips password hashes', async () => {
    const { data } = await login('admin@securex.io');
    const res = await request(app).get('/api/admin/users').set(bearer(data.token));
    assert.ok(res.body.data.length >= 15);
    assert.ok(!('passwordHash' in res.body.data[0]));
    assert.ok(!('password_hash' in res.body.data[0]));
  });

  test('security center aggregates are served for admin roles', async () => {
    const { data } = await login('security@securex.io');
    const overview = await request(app).get('/api/admin/security/overview').set(bearer(data.token));
    assert.equal(overview.status, 200);
    assert.equal(typeof overview.body.data.securityScore, 'number');
    assert.equal(overview.body.data.activeAlerts > 0, true);

    const integrity = await request(app).get('/api/admin/security/credential-integrity').set(bearer(data.token));
    assert.equal(integrity.body.data.total, 15);
    assert.equal(integrity.body.data.tampered, 1);

    const sessions = await request(app).get('/api/admin/security/sessions').set(bearer(data.token));
    assert.ok(sessions.body.data.length >= 3);

    const health = await request(app).get('/api/admin/security/service-health').set(bearer(data.token));
    assert.equal(health.body.data.length, 6);
  });

  test('alert status mutations are audited', async () => {
    const { data } = await login('security@securex.io');
    const res = await request(app)
      .post('/api/admin/security/alerts/alrt-001/status')
      .set(bearer(data.token))
      .send({ status: 'RESOLVED' });
    assert.equal(res.status, 200);

    const alerts = await request(app).get('/api/admin/security/alerts').set(bearer(data.token));
    const alert = alerts.body.data.find((a: { id: string }) => a.id === 'alrt-001');
    assert.equal(alert.status, 'RESOLVED');

    const audit = await request(app).get('/api/admin/security/audit').set(bearer(data.token));
    assert.ok(audit.body.data.some((e: { action: string }) => e.action === 'SECURITY_ALERT_RESOLVED'));
  });

  test('non-admin roles are forbidden from admin endpoints', async () => {
    const { data } = await login('emily.rodriguez@example.com');
    const res = await request(app).get('/api/admin/stats').set(bearer(data.token));
    assert.equal(res.status, 403);
  });

  test('institution role can issue a credential', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const res = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Certificate',
        title: 'Cloud Security Fundamentals',
        description: 'Foundational course credential issued for integration verification.',
        holderName: 'Emily Rodriguez',
        holderEmail: 'emily.rodriguez@example.com',
        holderId: 'usr-holder-001',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.credentialId.startsWith('SX-'));
    assert.match(res.body.data.id, /^cred-[0-9a-f]{8}-[0-9a-f]{4}/);
    assert.equal(res.body.data.status, 'VALID');
  });

  test('SIH flow: a newly issued credential is publicly verifiable with ledger proof', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const issue = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Degree',
        title: 'Master of Secure Systems',
        description: 'SIH demo issuance making the newly minted credential publicly verifiable.',
        holderName: 'Emily Rodriguez',
        holderEmail: 'emily.rodriguez@example.com',
        holderId: 'usr-holder-001',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(issue.status, 201);
    const issuedId = issue.body.data.credentialId as string;
    assert.ok(issuedId.startsWith('SX-'));

    const verify = await request(app)
      .get(`/api/verifications?credentialId=${issuedId}`);
    assert.equal(verify.status, 200);
    assert.equal(verify.body.data.status, 'VALID');
    assert.equal(verify.body.data.credential.credentialId, issuedId);
    assert.equal(verify.body.data.blockchainProof.verified, true);
    assert.ok(verify.body.data.blockchainProof.txHash);
  });

  test('credential revoke transitions and records a ledger event', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const res = await request(app)
      .post('/api/credentials/SX-3A17-B9F2-6D48/revoke')
      .set(bearer(data.token));
    assert.equal(res.status, 200);

    const cred = await request(app)
      .get('/api/credentials/SX-3A17-B9F2-6D48')
      .set(bearer((await login('admin@securex.io')).data.token));
    assert.equal(cred.body.data.status, 'REVOKED');
    assert.ok(cred.body.data.revokedAt);
  });

  test('identity: two consecutive issues produce distinct canonical identities', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const payload = {
      type: 'Certificate',
      description: 'identity-distinctness test',
      holderName: 'Emily Rodriguez',
      holderEmail: 'emily.rodriguez@example.com',
      issuerId: 'iss-stanford-online',
      issuerName: 'Stanford Online Learning',
      institutionId: 'inst-stanford',
      institutionName: 'Stanford University',
    };
    const a = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({ ...payload, title: 'Identity Test A' });
    const b = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({ ...payload, title: 'Identity Test B' });
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.notEqual(a.body.data.id, b.body.data.id);
    assert.notEqual(a.body.data.credentialId, b.body.data.credentialId);
    assert.match(a.body.data.id, /^cred-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.match(b.body.data.id, /^cred-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.match(a.body.data.credentialId, /^SX-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  test('identity: issued credential relationships land in the ledger and audit trail', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const issue = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Certificate',
        title: 'Relationship Trace Credential',
        description: 'identity-relational-trace test',
        holderName: 'Emily Rodriguez',
        holderEmail: 'emily.rodriguez@example.com',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(issue.status, 201);
    const iid = issue.body.data.id as string;
    const pub = issue.body.data.credentialId as string;

    const tx = await database.get<{ id: string; credential_row_id: string; type: string }>(
      'SELECT id, credential_row_id, type FROM transactions WHERE credential_row_id = $1 LIMIT 1',
      iid,
    );
    assert.ok(tx, 'ledger transaction references the issued credential via credential_row_id');
    assert.match(tx.id, /^0x/);
    assert.equal(tx.credential_row_id, iid);

    const audit = await database.get<{ id: string; action: string }>(
      'SELECT id, action FROM audit_events WHERE target = $1 AND action = $2 LIMIT 1',
      iid,
      'CREDENTIAL_ISSUED',
    );
    assert.ok(audit, 'audit event records the canonical internal credential id');
    assert.match(audit.id, /^aud-/);

    const rels = await database.get<{ holder: string; issuer: string; institution: string }>(
      `SELECT c.holder_id AS holder, c.issuer_id AS issuer, c.institution_id AS institution
         FROM credentials c WHERE c.id = $1`,
      iid,
    );
    assert.ok(rels);
    assert.equal(rels.holder, 'usr-holder-001');
    assert.equal(rels.issuer, 'iss-stanford-online');
    assert.equal(rels.institution, 'inst-stanford');
    assert.equal(pub.startsWith('SX-'), true);
  });

  test('identity: verify-after-create resolves the same canonical public ID via path and query', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const issue = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Degree',
        title: 'Canonical Verify Credential',
        description: 'identity-verify-after-create test',
        holderName: 'Emily Rodriguez',
        holderEmail: 'emily.rodriguez@example.com',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(issue.status, 201);
    const pub = issue.body.data.credentialId as string;
    const iid = issue.body.data.id as string;

    const byPath = await request(app).get(`/api/verifications/${pub}`);
    assert.equal(byPath.status, 200);
    assert.equal(byPath.body.data.credentialId, pub);
    assert.equal(byPath.body.data.credential.id, iid);
    assert.equal(byPath.body.data.credential.status, 'VALID');
    assert.equal(byPath.body.data.blockchainProof.verified, true);

    const byQuery = await request(app).get(`/api/verifications?credentialId=${pub}`);
    assert.equal(byQuery.status, 200);
    assert.equal(byQuery.body.data.credentialId, pub);
    assert.equal(byQuery.body.data.credential.id, iid);
  });

  test('identity: unknown holder email is auto-created and FK-referenced (backend owns identity)', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const res = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Certificate',
        title: 'Backend-Owned Identity',
        description: 'identity-autocreate-holder test',
        holderName: 'New Person',
        holderEmail: 'new.person-identity@example.com',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(res.status, 201);
    const holderId = res.body.data.holderId as string;
    assert.ok(holderId);

    const holder = await database.get<{ id: string; email: string }>(
      'SELECT id, email FROM holders WHERE id = $1',
      holderId,
    );
    assert.ok(holder, 'the backend persisted a canonical holder record');
    assert.equal(holder.email, 'new.person-identity@example.com');

    const ref = await database.get<{ n: string }>(
      'SELECT COUNT(*)::text AS n FROM credentials WHERE id = $1 AND holder_id = $2',
      res.body.data.id,
      holderId,
    );
    assert.ok(ref, 'expected the FK-referenced credential row to exist');
    assert.equal(ref.n, '1');
  });

  test('identity: holder who is a platform user aligns holder id with user id via email', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Mary Identity',
        email: 'mary.identity@example.com',
        password: 'Password123!',
        role: 'HOLDER',
      });
    assert.equal(reg.status, 201);
    const userId = reg.body.data.user.id as string;

    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const issue = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Certificate',
        title: 'Unified Holder Identity',
        description: 'identity-email-unification test',
        holderName: 'Mary Identity',
        holderEmail: 'mary.identity@example.com',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(issue.status, 201);
    assert.equal(
      issue.body.data.holderId,
      userId,
      'credential holder resolves to the same identity as the platform user with that email',
    );
  });

  test('constraint: duplicate public credential ID is rejected by the database', async () => {
    await assert.rejects(
      database.run(
        "INSERT INTO credentials (id, credential_id, type, title, description, holder_name, holder_id, issuer_id, institution_id, status, issued_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        'cred-collide-identity',
        'SX-2F9C-A41B-8D7E',
        'Degree',
        'Duplicate Public Id',
        'constraint test',
        'Emily Rodriguez',
        'usr-holder-001',
        'iss-stanford-cs',
        'inst-stanford',
        'VALID',
        new Date().toISOString(),
      ),
      (err: unknown) => (err as { code?: string }).code === '23505',
      'expected a duplicate-key violation on credentials.credential_id',
    );
  });

  test('constraint: foreign keys reject dangling holder/institution references', async () => {
    await assert.rejects(
      database.run(
        "INSERT INTO credentials (id, credential_id, type, title, description, holder_name, holder_id, issuer_id, institution_id, status, issued_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        'cred-bad-holder',
        'SX-C0DE-C0DE-C0DE',
        'Degree',
        'Bad Holder',
        'constraint test',
        'Nobody',
        'no-such-holder',
        'iss-stanford-cs',
        'inst-stanford',
        'VALID',
        new Date().toISOString(),
      ),
      (err: unknown) => (err as { code?: string }).code === '23503',
      'expected a foreign key violation on credentials.holder_id',
    );

    await assert.rejects(
      database.run(
        "INSERT INTO users (id, email, name, role, institution_id, password_hash, status, mfa_enabled, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        'usr-bad-inst',
        'bad-inst@example.com',
        'Bad Inst',
        'INSTITUTION',
        'no-such-institution',
        'x',
        'ACTIVE',
        0,
        new Date().toISOString(),
      ),
      (err: unknown) => (err as { code?: string }).code === '23503',
      'expected a foreign key violation on users.institution_id',
    );
  });

  test('constraint: database rejects duplicate entity ids (primary key)', async () => {
    await assert.rejects(
      database.run(
        'INSERT INTO institutions (id, name, type, website, verified, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        'inst-stanford',
        'Stanford Duplicate',
        'university',
        'https://example.com',
        0,
        'ACTIVE',
        new Date().toISOString(),
      ),
      (err: unknown) => (err as { code?: string }).code === '23505',
      'expected a duplicate-key violation on institutions pk',
    );
  });

  test('identity: credential identity survives a backend restart (re-init) unchanged', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const issue = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Degree',
        title: 'Persistent Identity',
        description: 'identity-restart-persistence test',
        holderName: 'Emily Rodriguez',
        holderEmail: 'emily.rodriguez@example.com',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(issue.status, 201);
    const iid = issue.body.data.id as string;
    const pub = issue.body.data.credentialId as string;

    // Simulate a backend restart: schema apply + seed guard are idempotent, so
    // this must not touch the pre-existing canonical identities.
    const { initDb } = await import('../db/database.js');
    await initDb();

    const cred = await request(app)
      .get(`/api/credentials/${iid}`)
      .set(bearer((await login('admin@securex.io')).data.token));
    assert.equal(cred.status, 200);
    assert.equal(cred.body.data.id, iid);
    assert.equal(cred.body.data.credentialId, pub);

    const verify = await request(app).get(`/api/verifications/${pub}`);
    assert.equal(verify.status, 200);
    assert.equal(verify.body.data.credentialId, pub);
    assert.equal(verify.body.data.credential.id, iid);
  });

  test('identity: revoke lifecycle keeps identity and traces the state change', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const issue = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Degree',
        title: 'Lifecycle Trace Credential',
        description: 'identity-revoke-lifecycle test',
        holderName: 'Emily Rodriguez',
        holderEmail: 'emily.rodriguez@example.com',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(issue.status, 201);
    const iid = issue.body.data.id as string;
    const pub = issue.body.data.credentialId as string;

    const revoke = await request(app)
      .post(`/api/credentials/${iid}/revoke`)
      .set(bearer(data.token));
    assert.equal(revoke.status, 200);

    const cred = await request(app)
      .get(`/api/credentials/${iid}`)
      .set(bearer((await login('admin@securex.io')).data.token));
    assert.equal(cred.body.data.status, 'REVOKED');
    assert.ok(cred.body.data.revokedAt);

    const tx = await database.get<{ type: string }>(
      'SELECT type FROM transactions WHERE credential_row_id = $1 AND type = $2 LIMIT 1',
      iid,
      'CREDENTIAL_REVOKED',
    );
    assert.ok(tx, 'revoke wrote a ledger transaction pointing at the same credential row');

    const audit = await database.get<{ action: string }>(
      'SELECT action FROM audit_events WHERE target = $1 AND action = $2 LIMIT 1',
      iid,
      'CREDENTIAL_REVOKED',
    );
    assert.ok(audit, 'audit trail captures the lifecycle transition under the canonical id');

    const verify = await request(app).get(`/api/verifications/${pub}`);
    assert.equal(verify.status, 200);
    assert.equal(verify.body.data.credentialId, pub);
    assert.equal(verify.body.data.status, 'REVOKED');
  });
});