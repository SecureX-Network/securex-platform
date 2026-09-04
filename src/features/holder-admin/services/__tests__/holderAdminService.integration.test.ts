import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api/client';
import {
  getCredentialIdsForHolder,
  resetOwnershipRegistry,
} from '../holderOwnership';
import type {
  ApiAuditEvent,
  ApiCredential,
  ApiIssuer,
  ApiIssuerHistory,
  ApiMutationReceipt,
  ApiVerifyResult,
} from '@/features/holder-admin/types/backend';

// Integration-oriented tests for the REAL SecureX Blockchain V3.1 API mapping.
//
// These exercise the actual holderAdminService mapping logic (and the real
// requestJson client wrapper) against a stubbed global fetch, so they NEVER
// depend on a live production backend and do NOT invent any endpoints. The
// stub returns exactly the shapes the backend contract defines in
// src/features/holder-admin/types/backend.ts.

interface FakeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function jsonResponse(data: unknown, status = 200): FakeResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function fakeApi<T>(data: T, status = 200): FakeResponse {
  return jsonResponse({ success: true, data }, status);
}

function failApi(error: string, message: string, status: number): FakeResponse {
  return jsonResponse({ success: false, error, message }, status);
}

let fetchMock: ReturnType<typeof vi.fn>;

async function loadRealService() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', 'false');
  const mod = await import('../holderAdminService');
  return mod;
}

const sampleIssuer: ApiIssuer = {
  issuerId: 'issuer-1',
  name: 'SecureX Demo University',
  publicKey: 'pubkey-1',
  status: 'ACTIVE',
  registeredAt: '2024-01-01T00:00:00.000Z',
  metadata: {},
};

const sampleCredential: ApiCredential = {
  credentialId: 'sxu-btech-2026-0001',
  issuerId: 'issuer-1',
  credentialHash: 'a'.repeat(64),
  status: 'ACTIVE',
  schemaVersion: '1.0',
  issuedAt: '2024-01-02T00:00:00.000Z',
  lastUpdated: '2024-01-02T00:00:00.000Z',
  metadata: { credentialType: 'B.Tech', subject: 'Computer Science Engineering' },
  lifecycle: [
    { type: 'ISSUED', timestamp: '2024-01-02T00:00:00.000Z', txId: 'tx-1', blockHeight: 5 },
  ],
};

const sampleVerify: ApiVerifyResult = {
  status: 'VALID',
  credentialId: 'sxu-btech-2026-0001',
  credentialHash: 'a'.repeat(64),
  issuer: { issuerId: 'issuer-1', name: 'SecureX Demo University', publicKey: 'pubkey-1', status: 'ACTIVE' },
  transaction: { id: 'tx-1', type: 'CREDENTIAL_ISSUE', sender: 'issuer-1', nonce: 1, blockHeight: 5, blockHash: 'block-5' },
  block: { height: 5, hash: 'block-5', timestamp: '2024-01-02T00:00:00.000Z', previousHash: 'prev', proposer: 'val-1', version: 2 },
  issuerSignatureValid: true,
  keyStatus: 'ACTIVE',
  protocolCompatible: true,
  verifiedAt: '2024-01-03T00:00:00.000Z',
};

const receipt: ApiMutationReceipt = {
  submitted: true,
  id: 'tx-99',
  type: 'CREDENTIAL_SUSPEND',
  sender: 'issuer-1',
  nonce: 4,
  status: 'PENDING',
};

describe('holderAdminService real backend integration', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('maps a real backend credential (ACTIVE -> VALID) with issuer name', async () => {
    const svc = await loadRealService();
    fetchMock
      .mockResolvedValueOnce(fakeApi(sampleCredential))
      .mockResolvedValueOnce(fakeApi(sampleIssuer));

    const credential = await svc.getRealCredential('sxu-btech-2026-0001');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/credentials/sxu-btech-2026-0001'),
      expect.anything(),
    );
    expect(credential.id).toBe('sxu-btech-2026-0001');
    expect(credential.status).toBe('VALID');
    expect(credential.issuerName).toBe('SecureX Demo University');
    expect(credential.blockchainTxHash).toBe('tx-1');
  });

  it('maps REVOKED and SUSPENDED backend statuses onto shared statuses', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi({ ...sampleCredential, status: 'REVOKED', revokedAt: '2024-02-01T00:00:00.000Z' }),
    );
    const revoked = await svc.getRealCredential('sxu-mba-2026-0001');
    expect(revoked.status).toBe('REVOKED');

    fetchMock.mockResolvedValueOnce(
      fakeApi({ ...sampleCredential, status: 'SUSPENDED', suspendedAt: '2024-02-01T00:00:00.000Z' }),
    );
    const suspended = await svc.getRealCredential('sxu-mba-2026-0001');
    expect(suspended.status).toBe('SUSPENDED');
  });

  it('lists issuers with credential counts derived from issuer history', async () => {
    const svc = await loadRealService();
    const history: ApiIssuerHistory = {
      issuerHistory: [],
      credentials: [{ currentStatus: 'ACTIVE', lastEvent: null, eventCount: 1 }],
    };
    fetchMock
      .mockResolvedValueOnce(fakeApi([sampleIssuer]))
      .mockResolvedValueOnce(fakeApi(history));

    const issuers = await svc.getRealIssuers();

    expect(issuers).toHaveLength(1);
    expect(issuers[0]!.name).toBe('SecureX Demo University');
    expect(issuers[0]!.status).toBe('ACTIVE');
    expect(issuers[0]!.credentialsIssued).toBe(1);
  });

  it('maps verification statuses for every backend state', async () => {
    const svc = await loadRealService();
    for (const status of ['VALID', 'REVOKED', 'SUSPENDED', 'EXPIRED', 'INVALID', 'NOT_FOUND', 'UNVERIFIABLE'] as const) {
      fetchMock.mockResolvedValueOnce(fakeApi({ ...sampleVerify, status }));
      const view = await svc.verifyRealCredential('sxu-btech-2026-0001');
      expect(view.status).toBe(status);
      if (status === 'NOT_FOUND') {
        expect(view.message).toContain('not found');
      } else {
        expect(view.message).toBeUndefined();
      }
    }
  });

  it('verifies with a document hash via POST /verify', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi({
        ...sampleVerify,
        documentHashCheck: {
          credentialId: 'sxu-btech-2026-0001',
          suppliedHash: 'b'.repeat(64),
          anchoredHash: 'a'.repeat(64),
          hashMatch: false,
          status: 'TAMPERED',
          verifiedAt: '2024-01-03T00:00:00.000Z',
        },
      }),
    );

    const view = await svc.verifyRealCredential('sxu-btech-2026-0001', 'b'.repeat(64));
    expect(view.documentHashCheck?.status).toBe('TAMPERED');
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST');
  });

  it('performs credential lifecycle mutations against the real endpoints', async () => {
    const svc = await loadRealService();

    fetchMock.mockResolvedValueOnce(fakeApi(receipt));
    const suspend = await svc.suspendRealCredential('sxu-btech-2026-0001', 'review');
    expect(suspend.submitted).toBe(true);
    expect(fetchMock.mock.calls[0]![0]).toContain('/credentials/sxu-btech-2026-0001/suspend');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ reason: 'review' });

    fetchMock.mockResolvedValueOnce(fakeApi(receipt));
    const reinstate = await svc.reinstateRealCredential('sxu-btech-2026-0001');
    expect(fetchMock.mock.calls[1]![0]).toContain('/reinstate');
    expect(reinstate.submitted).toBe(true);

    fetchMock.mockResolvedValueOnce(fakeApi(receipt));
    const revoke = await svc.revokeRealCredential('sxu-btech-2026-0001', 'fraud');
    expect(fetchMock.mock.calls[2]![0]).toContain('/revoke');
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ reason: 'fraud' });
    expect(revoke.submitted).toBe(true);
  });

  it('rejects a lifecycle transition the backend refused', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi({ submitted: false, id: 'x', type: 'SUSPEND', sender: 's', nonce: 1, status: 'PENDING' }),
    );
    await expect(svc.suspendRealCredential('sxu-btech-2026-0001')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
    });
  });

  it('enumerates the on-chain credential set and skips unknown IDs', async () => {
    const svc = await loadRealService();
    // issuers list
    fetchMock.mockResolvedValueOnce(fakeApi([sampleIssuer]));
    // first demo credential resolves, all others 404
    const { REAL_DEMO_CREDENTIAL_IDS } = await loadRealService();
    for (let i = 0; i < REAL_DEMO_CREDENTIAL_IDS.length; i++) {
      fetchMock.mockResolvedValueOnce(
        i === 0 ? fakeApi(sampleCredential) : failApi('CREDENTIAL_NOT_FOUND', 'Credential not found', 404),
      );
    }

    const credentials = await svc.getRealCredentials();
    expect(credentials).toHaveLength(1);
    expect(credentials[0]!.credentialId).toBe('sxu-btech-2026-0001');
  });

  it('maps backend audit events onto the shared AuditEvent shape', async () => {
    const svc = await loadRealService();
    const event: ApiAuditEvent = {
      id: 'ev-1',
      type: 'CREDENTIAL_SUSPEND',
      timestamp: '2024-01-02T00:00:00.000Z',
      severity: 'warning',
      message: 'credential suspended for review',
      referenceType: 'credential',
      credentialId: 'sxu-btech-2026-0001',
      actor: 'issuer-1',
    };
    fetchMock.mockResolvedValueOnce(fakeApi([event]));

    const events = await svc.getRealAuditEvents(50, 0);
    expect(events).toHaveLength(1);
    expect(events[0]!.id).toBe('ev-1');
    expect(events[0]!.action).toBe('CREDENTIAL_SUSPEND');
    expect(events[0]!.details).toContain('review');
    expect(events[0]!.target).toBe('sxu-btech-2026-0001');
  });

  it('surfaces a 404 as an ApiError (and does not retry 4xx)', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValue(failApi('UNKNOWN_ISSUER', 'Issuer not found', 404));

    await expect(svc.getRealIssuer('missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Issuer not found',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws an ApiError status 0 when the network is unreachable', async () => {
    const svc = await loadRealService();
    fetchMock.mockRejectedValue(new ApiError('Unable to reach the service. Please check your connection and try again.', 0));

    await expect(svc.getRealIssuer('issuer-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });
  });
});

describe('holder access control (off-chain ownership registry)', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('rejects access to a credential the holder does not own with an honest 403', async () => {
    const svc = await loadRealService();
    resetOwnershipRegistry();
    // usr-holder-003 owns only the sxpa-* demo credentials per the seed, so
    // sxu-btech-2026-0001 is NOT theirs -> the service must refuse up front.
    await expect(
      svc.getRealCredential('sxu-btech-2026-0001', 'usr-holder-003'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows access when the holder owns the credential', async () => {
    const svc = await loadRealService();
    resetOwnershipRegistry();
    // usr-holder-001 owns the first three demo credentials (incl. btech 0001).
    fetchMock
      .mockResolvedValueOnce(fakeApi(sampleCredential))
      .mockResolvedValueOnce(fakeApi(sampleIssuer));

    const credential = await svc.getRealCredential('sxu-btech-2026-0001', 'usr-holder-001');
    expect(credential.credentialId).toBe('sxu-btech-2026-0001');
  });

  it('shows only the credentials the holder owns in their wallet view', async () => {
    const svc = await loadRealService();
    resetOwnershipRegistry();
    // usr-holder-001 owns sxu-btech/mtech/mba-2026-0001 (3 credentials).
    fetchMock.mockResolvedValueOnce(fakeApi([sampleIssuer]));
    const owned = getCredentialIdsForHolder('usr-holder-001');
    for (const id of owned) {
      fetchMock.mockResolvedValueOnce(fakeApi({ ...sampleCredential, credentialId: id }));
    }

    const view = await svc.getHolderCredentialsView('usr-holder-001');
    expect(view.map((c) => c.credentialId).sort()).toEqual([...owned].sort());
    // All three owned credentials are returned and never another holder's set.
    expect(view).toHaveLength(3);
  });

  it('returns an empty wallet (no backend probe) for a holder with no owned credentials', async () => {
    const svc = await loadRealService();
    const map: Record<string, string[]> = { 'empty-holder': [] };
    localStorage.setItem('securex_holder_ownership_v1', JSON.stringify(map));
    try {
      const view = await svc.getHolderCredentialsView('empty-holder');
      expect(view).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      localStorage.removeItem('securex_holder_ownership_v1');
    }
  });
});

describe('issuer lifecycle + privileged auth (Target 2 + Target 10)', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.removeItem('securex_holder_ownership_v1');
  });

  it('suspends and activates an issuer against the real endpoints', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi(receipt));
    const suspended = await svc.suspendRealIssuer('issuer-1', 'policy review');
    expect(suspended.submitted).toBe(true);
    expect(fetchMock.mock.calls[0]![0]).toContain('/issuers/issuer-1/suspend');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ reason: 'policy review' });

    fetchMock.mockResolvedValueOnce(fakeApi(receipt));
    const activated = await svc.activateRealIssuer('issuer-1', 'restore');
    expect(activated.submitted).toBe(true);
    expect(fetchMock.mock.calls[1]![0]).toContain('/issuers/issuer-1/activate');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ reason: 'restore' });
  });

  it('throws a 400 when the backend rejects the issuer lifecycle change', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi({ submitted: false, id: 'x', type: 'ISSUER_SUSPEND', sender: 's', nonce: 1, status: 'PENDING' }),
    );
    await expect(svc.suspendRealIssuer('issuer-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
    });
  });

  it('forwards the configured principal token and does not override it with the UI session token', async () => {
    const svc = await loadRealService();
    vi.stubEnv('VITE_BLOCKCHAIN_AUTH_TOKEN', 'tkn-principal');
    try {
      localStorage.setItem('securex_auth_token', 'tkn-session');
      fetchMock.mockResolvedValueOnce(fakeApi(receipt));
      await svc.suspendRealIssuer('issuer-1');

      const headers = new Headers(fetchMock.mock.calls[0]![1].headers);
      expect(headers.get('Authorization')).toBe('Bearer tkn-principal');
    } finally {
      vi.unstubAllEnvs();
      localStorage.removeItem('securex_auth_token');
    }
  });

  it('produces authorization via the configured principal token even when it equals the session token shape', async () => {
    const svc = await loadRealService();
    vi.stubEnv('VITE_BLOCKCHAIN_AUTH_TOKEN', 'admin:secret');
    try {
      localStorage.setItem('securex_auth_token', 'some-other-session');
      fetchMock.mockResolvedValueOnce(fakeApi(receipt));
      await svc.activateRealIssuer('issuer-1');

      const headers = new Headers(fetchMock.mock.calls[0]![1].headers);
      expect(headers.get('Authorization')).toBe('Bearer admin:secret');
    } finally {
      vi.unstubAllEnvs();
      localStorage.removeItem('securex_auth_token');
    }
  });
});
