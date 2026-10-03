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

// Mirror the production CORS allowlist exactly (see render.yaml).
//
// The Explorer's origins MUST be in this list. When they are absent the
// preflight still returns 204 but with no Access-Control-Allow-Origin header,
// so the browser discards every response and the Explorer renders
// "Blockchain service unavailable" even while the chain is completely healthy.
// That failure is invisible server-side, which is why it is pinned here.
process.env.CORS_ORIGINS = [
  'https://app-securex.sp-net.in',
  'https://securex-explorer.vercel.app',
  'https://explorer-securex.sp-net.in',
].join(',');

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

// Config and the landing view are resolved inside `before()` rather than via
// static imports: static imports are hoisted above the process.env assignments
// above, so they would capture the ambient environment instead of the test one.
let serverConfig: typeof import('../config.js').serverConfig;
let renderLandingPage: typeof import('../views/landing.js').renderLandingPage;

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
  serverConfig = (await import('../config.js')).serverConfig;
  renderLandingPage = (await import('../views/landing.js')).renderLandingPage;
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

  test('credentials list requires auth and is scoped to the caller', async () => {
    const { data } = await login('emily.rodriguez@example.com');
    const res = await request(app).get('/api/credentials').set(bearer(data.token));
    assert.equal(res.status, 200);
    const creds = res.body.data as Array<{
      credentialId: string;
      holderId: string;
      status: string;
    }>;
    // A holder only ever sees their own wallet: the list is scoped by the
    // BACKEND, so it can never widen by passing another holder's id.
    assert.ok(creds.length > 0);
    assert.ok(creds.every((c) => c.holderId === 'usr-holder-001'));
    assert.ok(
      creds.some((c) => c.credentialId === 'SX-2F9C-A41B-8D7E' && c.status === 'VALID'),
    );
    // Another holder's record is never in the list.
    assert.ok(!creds.some((c) => c.credentialId === 'SX-EF4B-390A-7C58'));

    const admin = await login('admin@securex.io');
    const all = await request(app)
      .get('/api/credentials')
      .set(bearer(admin.data.token));
    const allCreds = all.body.data as Array<{ credentialId: string; status: string }>;
    assert.equal(allCreds.length, 15);
    assert.ok(
      allCreds.some(
        (c) => c.credentialId === 'SX-EF4B-390A-7C58' && c.status === 'TAMPERED',
      ),
    );
  });

  test('an out-of-scope credential reads as not found', async () => {
    const { data } = await login('emily.rodriguez@example.com');
    // cred-015 belongs to another holder (usr-holder-002).
    const res = await request(app)
      .get('/api/credentials/SX-EF4B-390A-7C58')
      .set(bearer(data.token));
    assert.equal(res.status, 404);
    assert.equal(res.body.errorCode, 'CREDENTIAL_NOT_FOUND');
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
    assert.equal(res.body.data.credentialId, 'SX-2F9C-A41B-8D7E');
    assert.equal(res.body.data.issuerName, 'Stanford University');
    assert.equal(res.body.data.checks.credentialRecord.verified, true);
    // No blockchain proof is claimed. In this suite no chain credential is
    // configured, so the integration exists but is unreachable: it reports
    // `available: true, verified: false` and explains why, rather than claiming
    // a capability that does not exist. Crucially it exposes no evidence.
    assert.equal(res.body.data.checks.blockchainProof.verified, false);
    assert.equal(res.body.data.checks.blockchainProof.available, true);
    assert.equal(res.body.data.checks.blockchainProof.evidence, undefined);
    assert.equal(res.body.data.checks.signature.verified, false);
    assert.equal(res.body.data.checks.signature.available, true);
    // The public DTO exposes no internal credential record and no holder data.
    assert.equal('credential' in res.body.data, false);
    assert.equal('holderId' in res.body.data, false);
    assert.equal('holderName' in res.body.data, false);
    assert.equal('merkleRoot' in res.body.data, false);
  });

  test('verifications report NOT_FOUND for unknown IDs', async () => {
    const res = await request(app).get('/api/verifications?credentialId=SX-0000-0000-0000');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'NOT_FOUND');
    assert.equal(res.body.data.storedStatus, 'NOT_FOUND');
    assert.equal(res.body.data.issuerName, null);
    assert.equal(res.body.data.checks.credentialRecord.verified, false);
    assert.equal(res.body.data.checks.credentialRecord.status, 'NOT_FOUND');
    assert.equal(res.body.data.checks.blockchainProof.verified, false);
  });

  test('wallet-shared public credential IDs resolve on the platform', async () => {
    const res = await request(app).get('/api/verifications?credentialId=SX-7A31-C0E4-19F6');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'VALID');
    assert.equal(res.body.data.credentialId, 'SX-7A31-C0E4-19F6');
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
      assert.equal(res.body.data.credentialId, id);
    }
  });

  test('verifications with a matching document hash report EXACT', async () => {
    // The document hash compared here is the canonical credential-document hash
    // that is anchored on-chain (`credentials.credential_hash`) — NOT the Merkle
    // root, which is a property of the containing block rather than of the
    // document. Seed a known value so the comparison is deterministic.
    const known = 'a'.repeat(64);
    await database.run(
      `UPDATE credentials SET credential_hash = ? WHERE credential_id = ?`,
      known,
      'SX-2F9C-A41B-8D7E',
    );

    const res = await request(app)
      .get(`/api/verifications?credentialId=SX-2F9C-A41B-8D7E&hash=${known}`);
    assert.equal(res.status, 200);
    const integrity = res.body.data.checks.documentIntegrity;
    assert.equal(integrity.status, 'EXACT');
    assert.equal(integrity.hashMatch, true);
    assert.equal(integrity.scope, 'PLATFORM_RECORD');
    // The stored reference itself is never returned by the public endpoint.
    assert.equal('anchoredHash' in integrity, false);
    // No chain was consulted, so no signature is reported as valid.
    assert.equal(res.body.data.checks.signature.verified, false);
  });

  test('verifications with a mismatched document hash flag a tamper check', async () => {
    const res = await request(app)
      .get(`/api/verifications?credentialId=SX-2F9C-A41B-8D7E&hash=${'f'.repeat(64)}`);
    assert.equal(res.status, 200);
    const integrity = res.body.data.checks.documentIntegrity;
    assert.equal(integrity.status, 'TAMPERED');
    assert.equal(integrity.hashMatch, false);
    // The credential record itself is still the platform's VALID record: a
    // document mismatch is reported as a document-integrity result, not as a
    // fabricated ledger or signature finding.
    assert.equal(res.body.data.checks.credentialRecord.verified, true);
    assert.equal(res.body.data.checks.signature.verified, false);
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

  test('SIH flow: a newly issued credential is publicly verifiable from the platform record', async () => {
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
    assert.equal(verify.body.data.credentialId, issuedId);
    assert.equal(verify.body.data.issuerName, 'Stanford University');
    assert.equal(verify.body.data.checks.credentialRecord.verified, true);
    // Issuance is NOT reported as a blockchain proof. The chain write was
    // attempted server-side and, with no chain credential configured here, it
    // was recorded as UNAVAILABLE — which the public surface reports as an
    // unverified integration, never as a fabricated proof.
    assert.equal(verify.body.data.checks.blockchainProof.verified, false);
    assert.equal(verify.body.data.checks.blockchainProof.available, true);
    assert.equal(verify.body.data.checks.signature.verified, false);
    assert.equal('txHash' in verify.body.data.checks.blockchainProof, false);

    // The attempt was recorded against the credential row as UNAVAILABLE with a
    // reason, so operators can tell "never anchored" from "anchored, cannot be
    // proven right now" without inspecting logs.
    const row = await database.get<{ anchor_status: string | null; anchor_error: string | null; credential_hash: string | null }>(
      `SELECT anchor_status, anchor_error, credential_hash FROM credentials WHERE credential_id = ?`,
      issuedId,
    );
    assert.equal(row?.anchor_status, 'UNAVAILABLE');
    assert.ok(row?.anchor_error, 'an unavailable anchor must record why');
    assert.match(row?.credential_hash ?? '', /^[0-9a-f]{64}$/, 'issuance always records the document hash');
  });

  test('verifications report document integrity as unverifiable when no hash is stored', async () => {
    // A credential with no anchored document hash must NOT be reported as an
    // exact match. "No reference recorded" and "matches" are different claims,
    // so the check reports UNVERIFIABLE instead of inventing a comparison.
    await database.run(
      `UPDATE credentials SET credential_hash = NULL WHERE credential_id = ?`,
      'SX-2F9C-A41B-8D7E',
    );
    const res = await request(app)
      .get(`/api/verifications?credentialId=SX-2F9C-A41B-8D7E&hash=${'a'.repeat(64)}`);
    assert.equal(res.status, 200);
    const integrity = res.body.data.checks.documentIntegrity;
    assert.equal(integrity.status, 'UNVERIFIABLE');
    assert.equal(integrity.hashMatch, false);
    assert.match(integrity.detail, /no anchored document hash/i);
  });

  test('a cross-tenant lifecycle transition is refused as not found', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    // cred-005 (SX-3A17-B9F2-6D48) belongs to inst-ancc, not to Stanford, so the
    // object-level authorization refuses it — and reports it identically to a
    // missing credential so the endpoint cannot probe other tenants.
    const res = await request(app)
      .post('/api/credentials/SX-3A17-B9F2-6D48/revoke')
      .set(bearer(data.token));
    assert.equal(res.status, 404);
    assert.equal(res.body.errorCode, 'CREDENTIAL_NOT_FOUND');
  });

  test('credential revoke transitions the platform record', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const issue = await request(app)
      .post('/api/credentials')
      .set(bearer(data.token))
      .send({
        type: 'Certificate',
        title: 'Revoke Scope Credential',
        description: 'lifecycle revoke within the caller institution',
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

    const res = await request(app)
      .post(`/api/credentials/${issuedId}/revoke`)
      .set(bearer(data.token));
    assert.equal(res.status, 200);

    const cred = await request(app)
      .get(`/api/credentials/${issuedId}`)
      .set(bearer((await login('admin@securex.io')).data.token));
    assert.equal(cred.body.data.status, 'REVOKED');
    assert.ok(cred.body.data.revokedAt);

    // Public verification reports the revoked state with no reason exposed.
    const verify = await request(app).get(`/api/verifications/${issuedId}`);
    assert.equal(verify.body.data.status, 'REVOKED');
    assert.equal('revokedReason' in verify.body.data, false);
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
    assert.equal(byPath.body.data.status, 'VALID');
    assert.equal(byPath.body.data.checks.credentialRecord.verified, true);
    // The public DTO deliberately does not carry the internal record id, so the
    // canonical linkage is asserted through the authenticated platform record.
    assert.equal('credential' in byPath.body.data, false);
    const record = await request(app)
      .get(`/api/credentials/${pub}`)
      .set(bearer((await login('admin@securex.io')).data.token));
    assert.equal(record.status, 200);
    assert.equal(record.body.data.id, iid);
    assert.equal(record.body.data.credentialId, pub);

    const byQuery = await request(app).get(`/api/verifications?credentialId=${pub}`);
    assert.equal(byQuery.status, 200);
    assert.equal(byQuery.body.data.credentialId, pub);
    // Both forms answer from the same canonical record.
    assert.equal(byQuery.body.data.storedStatus, byPath.body.data.storedStatus);
    assert.equal(byQuery.body.data.issuedAt, byPath.body.data.issuedAt);
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
    assert.equal(verify.body.data.status, 'VALID');
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
/**
 * The public landing page at GET / renders the same operational facts that
 * /api/health reports, so these tests pin both the HTML surface and the
 * invariant that the JSON health contract is untouched.
 */
describe('GET / landing page', () => {
  test('returns 200 as HTML', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.match(String(res.headers['content-type']), /text\/html/);
  });

  test('identifies the service and carries real status values', async () => {
    const res = await request(app).get('/');
    const html = res.text as string;

    assert.ok(html.includes('SecureX API'), 'renders the service name');
    assert.ok(
      html.includes('Digital Credential Trust Network — Production API'),
      'renders the product subtitle',
    );
    assert.ok(html.includes('SECUREX'), 'renders the brand');
    assert.ok(html.includes('API / Trust Infrastructure'), 'renders the brand descriptor');
    assert.ok(html.includes('System Status'), 'renders the status section');
    assert.ok(html.includes('API Services'), 'renders the services section');

    // Values must come from the live health payload, not be hardcoded.
    const health = await (await request(app).get('/api/health')).body.data;
    assert.ok(html.includes(health.version), 'shows the API version reported by /api/health');
    assert.ok(
      html.includes(health.dataMode.charAt(0).toUpperCase() + health.dataMode.slice(1)),
      'shows the data mode reported by /api/health',
    );
    assert.ok(html.includes('PostgreSQL'), 'names the database technology');

    // Connected database => the operational state is reported honestly.
    assert.equal(health.database, 'connected');
    assert.ok(html.includes('Operational'), 'reports the operational state');
    assert.ok(html.includes('Connected'), 'reports the database state');
  });

  test('links to the real endpoints and neighbouring products', async () => {
    const res = await request(app).get('/');
    const html = res.text as string;

    assert.ok(html.includes('/api/health'), 'links the health endpoint');
    assert.ok(html.includes('https://app-securex.sp-net.in/'), 'links the application');
    assert.ok(html.includes('https://securex.sp-net.in/'), 'links the website');

    // API areas are limited to routes that are actually mounted.
    for (const area of [
      '/api/auth/login',
      '/api/credentials',
      '/api/verifications',
      '/api/institutions',
      '/api/blockchain',
      '/api/network/stats',
      '/api/admin',
    ]) {
      assert.ok(html.includes(area), `documents the mounted ${area} area`);
    }
  });

  test('leaks no secrets and needs no client-side JavaScript', async () => {
    const res = await request(app).get('/');
    const html = res.text as string;

    // The CSP is script-src 'self' with no unsafe-inline, so the page must be
    // pure server-rendered HTML. No <script> means it renders with JS disabled.
    assert.ok(!/<script/i.test(html), 'emits no script tags');
    assert.ok(!/\son\w+=/i.test(html), 'emits no inline event handlers');

    for (const forbidden of [
      'postgres://',
      serverConfig.jwtSecret,
      serverConfig.databaseUrl,
      serverConfig.bootstrapAdminEmail,
      serverConfig.blockchainAuthToken,
      'DATABASE_URL',
      'JWT_SECRET',
      'BOOTSTRAP_ADMIN',
    ]) {
      if (!forbidden) continue;
      assert.ok(!html.includes(forbidden), `does not expose ${forbidden.slice(0, 24)}`);
    }
  });

  test('refuses to reflect a crafted Host header', async () => {
    const res = await request(app).get('/').set('Host', 'evil.example.com"><script>x</script>');
    const html = res.text as string;
    assert.equal(res.status, 200);
    assert.ok(!html.includes('<script>x<'), 'does not reflect injected markup');
    assert.ok(!html.includes('evil.example.com'), 'falls back to a safe base URL');
  });

  test('/api/health is unchanged and still JSON', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.match(String(res.headers['content-type']), /application\/json/);
    assert.equal(res.body.success, true);
    // Exact contract the frontend and the landing page both depend on.
    assert.deepEqual(Object.keys(res.body.data).sort(), [
      'dataMode',
      'database',
      'service',
      'status',
      'time',
      'version',
    ]);
    assert.equal(res.body.data.status, 'ok');
    assert.equal(res.body.data.service, 'securex-platform-api');
    assert.equal(res.body.data.version, '1.0.0');
  });

  test('reports a degraded state when the database is unavailable', async () => {
    const degraded = {
      status: 'ok',
      service: 'securex-platform-api',
      version: serverConfig.apiVersion,
      time: new Date().toISOString(),
      dataMode: serverConfig.dataMode,
      database: 'unavailable',
    } as const;

    const html = renderLandingPage(
      { headers: { host: 'api-securex.sp-net.in' }, protocol: 'https' } as never,
      degraded,
    );

    assert.ok(html.includes('Degraded'), 'does not claim Operational while the database is down');
    assert.ok(html.includes('Unavailable'), 'reports the database as unavailable');
  });
});

describe('CORS allowlist', () => {
  // The Explorer is a public, read-only first-party surface: no session, no
  // cookie, no credential. It is allowed to READ the public /api/blockchain/*
  // responses and nothing else. These tests pin both halves of that promise --
  // the listed origins really are allowed, and an unlisted origin still is not.
  const ALLOWED = [
    'https://app-securex.sp-net.in',
    'https://securex-explorer.vercel.app',
    'https://explorer-securex.sp-net.in',
  ];

  for (const origin of ALLOWED) {
    test(`allows the read-only blockchain endpoints from ${origin}`, async () => {
      const res = await request(app)
        .options('/api/blockchain/health')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET');

      assert.ok(
        res.status === 204 || res.status === 200,
        `preflight should succeed, got ${res.status}`,
      );
      assert.equal(
        res.headers['access-control-allow-origin'],
        origin,
        'the browser needs the exact origin echoed back or it discards the response',
      );
    });
  }

  test('does not grant an unlisted origin any access', async () => {
    const res = await request(app)
      .options('/api/blockchain/health')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');

    assert.equal(
      res.headers['access-control-allow-origin'],
      undefined,
      'an unlisted origin must not be reflected back',
    );
  });

  test('a CORS grant is not an authorization grant', async () => {
    // Allowed to read must not mean allowed to act. The privileged routes stay
    // JWT-protected regardless of where the request comes from.
    const explorerOrigin = 'https://securex-explorer.vercel.app';
    const res = await request(app).get('/api/admin/users').set('Origin', explorerOrigin);

    assert.equal(res.status, 401, 'an allowlisted origin must still authenticate for admin routes');
  });
});
