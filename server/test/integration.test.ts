import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import type { Express } from 'express';

process.env.APP_ENV = 'test';
process.env.DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), 'securex-api-test-')), 'test.db');
process.env.SEED_ON_BOOT = 'true';
process.env.DATA_MODE = 'demo';
process.env.JWT_SECRET = 'integration-test-secret-0123456789abcdef-tests-only';

let app: Express;
let closeDb: () => void;

before(async () => {
  const database = await import('../db/database.js');
  closeDb = database.closeDb;
  database.initDb();
  const { createApp: appFactory } = await import('../app.js');
  app = appFactory();
});

after(() => {
  closeDb();
  rmSync(path.dirname(process.env.DB_PATH as string), { recursive: true, force: true });
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
        holderId: 'usr-holder-001',
        issuerId: 'iss-stanford-online',
        issuerName: 'Stanford Online Learning',
        institutionId: 'inst-stanford',
        institutionName: 'Stanford University',
      });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.credentialId.startsWith('SX-'));
    assert.equal(res.body.data.status, 'VALID');
  });

  test('credential revoke transitions and records a ledger event', async () => {
    const { data } = await login('s.chen@stanford.edu', 'INSTITUTION');
    const res = await request(app)
      .post('/api/credentials/SX-C0B4-62A7-5E91/revoke')
      .set(bearer(data.token));
    assert.equal(res.status, 200);

    const cred = await request(app)
      .get('/api/credentials/SX-C0B4-62A7-5E91')
      .set(bearer((await login('admin@securex.io')).data.token));
    assert.equal(cred.body.data.status, 'REVOKED');
    assert.ok(cred.body.data.revokedAt);
  });
});