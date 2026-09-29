import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '@/constants';
import type {
  ChainAuditEventDto,
  ChainCredentialHistoryDto,
  ChainHealthDto,
  ChainIssuerDto,
  ChainIssuerHistoryDto,
  ChainMutationReceiptDto,
  ChainStateDto,
} from '@/services/api/blockchainProxy';
import type { PublicVerificationResult } from '@/services/api/verificationService';
import type { Credential } from '@/types';

// Integration-oriented tests for the REAL SecureX Platform API mapping.
//
// These exercise the actual holderAdminService logic (and the real requestJson
// client wrapper) against a stubbed global fetch, so they NEVER depend on a live
// service and do NOT invent any endpoints.
//
// Two rules are asserted throughout, because they are the architecture:
//   1. The browser has ONE egress: the Platform API. Chain reads/writes are
//      requested from /api/blockchain/* and proxied server-side.
//   2. Access control is server-side. There is no browser-side ownership
//      registry, so the service never filters another caller's data locally and
//      never invents a 403 the backend did not return.

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

let fetchMock: ReturnType<typeof vi.fn>;

async function loadRealService() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK', 'false');
  const mod = await import('../holderAdminService');
  return mod;
}

/** The url passed to fetch for the nth call. */
function callUrl(index: number): string {
  return String(fetchMock.mock.calls[index]![0]);
}

/** The parsed JSON body of the nth call. */
function callBody(index: number): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[index]![1].body)) as Record<
    string,
    unknown
  >;
}

const sampleCredential: Credential = {
  id: 'SX-7A31-C0E4-19F6',
  credentialId: 'SX-7A31-C0E4-19F6',
  type: 'Degree',
  title: 'B.Tech Computer Science',
  description: '',
  holderName: 'Asha Patel',
  holderId: 'usr-holder-001',
  issuerId: 'issuer-1',
  issuerName: 'SecureX Demo University',
  institutionId: 'inst-1',
  institutionName: 'SecureX Demo University',
  status: 'VALID',
  issuedAt: '2024-01-02T00:00:00.000Z',
};

const sampleIssuer: ChainIssuerDto = {
  id: 'issuer-1',
  name: 'SecureX Demo University',
  publicKey: 'pubkey-1',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const sampleIssuerHistory: ChainIssuerHistoryDto = {
  issuerHistory: [],
  credentials: [
    { currentStatus: 'ACTIVE', lastEvent: null, eventCount: 1 },
    { currentStatus: 'REVOKED', lastEvent: null, eventCount: 2 },
  ],
};

const NOT_PERFORMED = {
  verified: false,
  available: false,
  status: 'UNVERIFIED' as const,
  detail:
    'Blockchain anchoring is not verified. SecureX has not obtained a block inclusion proof for this credential.',
};

function buildVerification(
  overrides: Partial<PublicVerificationResult> = {},
): PublicVerificationResult {
  return {
    credentialId: 'SX-7A31-C0E4-19F6',
    status: 'VALID',
    storedStatus: 'VALID',
    issuerName: 'SecureX Demo University',
    issuedAt: '2024-01-02T00:00:00.000Z',
    expiresAt: null,
    revokedAt: null,
    verifiedAt: '2024-01-03T00:00:00.000Z',
    checks: {
      credentialRecord: {
        verified: true,
        available: true,
        status: 'VERIFIED',
        detail: 'A credential record with this ID exists in the SecureX Platform.',
      },
      blockchainProof: NOT_PERFORMED,
      signature: NOT_PERFORMED,
    },
    message: 'Credential record verified.',
    ...overrides,
  };
}

describe('holderAdminService real backend integration', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.removeItem('securex_auth_token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // Credential records
  // -------------------------------------------------------------------------

  it('reads a credential from the Platform API record', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi(sampleCredential));

    const credential = await svc.getRealCredential('SX-7A31-C0E4-19F6');

    expect(callUrl(0)).toContain('/credentials/SX-7A31-C0E4-19F6');
    // Display data is the platform record's, returned as-is: the service never
    // re-derives holder/issuer names from the chain.
    expect(credential.credentialId).toBe('SX-7A31-C0E4-19F6');
    expect(credential.status).toBe('VALID');
    expect(credential.issuerName).toBe('SecureX Demo University');
  });

  it('lists credentials from the Platform API', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi([sampleCredential]));

    const credentials = await svc.getRealCredentials();

    expect(callUrl(0)).toContain('/credentials');
    expect(credentials).toHaveLength(1);
  });

  it('narrows the holder wallet server-side and never filters locally', async () => {
    const svc = await loadRealService();
    const otherHolderCredential: Credential = {
      ...sampleCredential,
      credentialId: 'SX-AAAA-0000-0000',
      id: 'SX-AAAA-0000-0000',
      holderId: 'usr-holder-009',
    };
    fetchMock.mockResolvedValue(fakeApi([sampleCredential, otherHolderCredential]));

    const view = await svc.getHolderCredentialsView('usr-holder-001');

    // The holder id is forwarded as a filter the BACKEND applies; whatever the
    // backend returns is what the holder sees. The client does not second-guess
    // it with a local ownership list.
    expect(callUrl(0)).toContain('/credentials?holderId=usr-holder-001');
    expect(view.map((c) => c.credentialId)).toEqual([
      'SX-7A31-C0E4-19F6',
      'SX-AAAA-0000-0000',
    ]);
  });

  it('returns an empty wallet without inventing credentials', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi([]));

    const view = await svc.getHolderCredentialsView('usr-holder-404');
    expect(view).toEqual([]);
  });

  it('surfaces the backend verdict for a credential outside the caller scope', async () => {
    const svc = await loadRealService();
    fetchMock.mockImplementation(async () =>
      jsonResponse(
        { success: false, error: 'Not found', message: 'Credential not found' },
        404,
      ),
    );

    // No browser-side ownership check precedes the request: the Platform API is
    // the only authority on who may read a credential.
    await expect(svc.getRealCredential('SX-XXXX-0000-0000')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Credential not found',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads the on-chain lifecycle history through the proxy', async () => {
    const svc = await loadRealService();
    const history: ChainCredentialHistoryDto = [
      {
        type: 'ISSUED',
        timestamp: '2024-01-02T00:00:00.000Z',
        transactionId: 'tx-1',
        blockHeight: 5,
      },
    ];
    fetchMock.mockResolvedValueOnce(fakeApi(history));

    const events = await svc.getRealCredentialHistory('SX-7A31-C0E4-19F6');

    expect(callUrl(0)).toContain('/blockchain/credentials/SX-7A31-C0E4-19F6/history');
    expect(events).toHaveLength(1);
    expect(events[0]!.transactionId).toBe('tx-1');
  });

  // -------------------------------------------------------------------------
  // Verification (public verification DTO)
  // -------------------------------------------------------------------------

  it('verifies through the public verification endpoint and keeps unavailable checks unavailable', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(fakeApi(buildVerification()));

    const view = await svc.verifyRealCredential('SX-7A31-C0E4-19F6');

    expect(callUrl(0)).toContain('/verifications?credentialId=SX-7A31-C0E4-19F6');
    expect(view.status).toBe('VALID');
    expect(view.storedStatus).toBe('VALID');
    expect(view.issuerName).toBe('SecureX Demo University');
    expect(view.checks.credentialRecord.verified).toBe(true);
    // Not implemented checks are reported as such — never upgraded to "verified".
    expect(view.checks.blockchainProof).toEqual(NOT_PERFORMED);
    expect(view.checks.signature).toEqual(NOT_PERFORMED);
  });

  it('reports a NOT_FOUND verification without inventing a ledger answer', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi(
        buildVerification({
          credentialId: 'SX-ABCD-0000-0000',
          status: 'NOT_FOUND',
          storedStatus: 'NOT_FOUND',
          issuerName: null,
          issuedAt: null,
          checks: {
            credentialRecord: {
              verified: false,
              available: true,
              status: 'NOT_FOUND',
              detail: 'No credential record with this ID exists in the SecureX Platform.',
            },
            blockchainProof: NOT_PERFORMED,
            signature: NOT_PERFORMED,
          },
          message:
            'No credential record with this ID exists in the SecureX Platform.',
        }),
      ),
    );

    const view = await svc.verifyRealCredential('SX-ABCD-0000-0000');

    expect(view.status).toBe('NOT_FOUND');
    expect(view.checks.credentialRecord.verified).toBe(false);
    expect(view.message).toContain('No credential record');
  });

  it('verifies a supplied document hash and surfaces the integrity comparison', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi(
        buildVerification({
          checks: {
            credentialRecord: {
              verified: true,
              available: true,
              status: 'VERIFIED',
              detail: 'A credential record with this ID exists.',
            },
            blockchainProof: NOT_PERFORMED,
            signature: NOT_PERFORMED,
            documentIntegrity: {
              credentialId: 'SX-7A31-C0E4-19F6',
              suppliedHash: 'b'.repeat(64),
              hashMatch: false,
              status: 'TAMPERED',
              scope: 'PLATFORM_RECORD',
              detail: 'The supplied hash does not match the platform record.',
              verifiedAt: '2024-01-03T00:00:00.000Z',
            },
          },
        }),
      ),
    );

    const view = await svc.verifyRealCredential('SX-7A31-C0E4-19F6', 'b'.repeat(64));

    expect(callUrl(0)).toContain('hash=');
    expect(view.documentIntegrity?.status).toBe('TAMPERED');
    expect(view.documentIntegrity?.scope).toBe('PLATFORM_RECORD');
    // The stored reference itself is never part of the view.
    expect(view.documentIntegrity).not.toHaveProperty('anchoredHash');
  });

  // -------------------------------------------------------------------------
  // Lifecycle transitions
  // -------------------------------------------------------------------------

  it('relays lifecycle transitions to the proxy with an action payload', async () => {
    const svc = await loadRealService();
    const submitted: ChainMutationReceiptDto = {
      submitted: true,
      id: 'tx-99',
      status: 'PENDING',
    };

    fetchMock.mockResolvedValueOnce(fakeApi(submitted));
    const suspend = await svc.suspendRealCredential('SX-7A31-C0E4-19F6', 'review');
    expect(suspend).toEqual(submitted);
    expect(callUrl(0)).toContain(
      '/blockchain/credentials/SX-7A31-C0E4-19F6/transitions',
    );
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST');
    expect(callBody(0)).toEqual({ action: 'suspend', reason: 'review' });

    fetchMock.mockResolvedValueOnce(fakeApi(submitted));
    await svc.reinstateRealCredential('SX-7A31-C0E4-19F6');
    expect(callBody(1)).toEqual({ action: 'reinstate' });

    fetchMock.mockResolvedValueOnce(fakeApi(submitted));
    await svc.revokeRealCredential('SX-7A31-C0E4-19F6', 'fraud');
    expect(callBody(2)).toEqual({ action: 'revoke', reason: 'fraud' });
  });

  it('treats a not-submitted receipt as a failure instead of a completed change', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValueOnce(
      fakeApi({ submitted: false, id: 'tx-99', status: 'REJECTED' }),
    );

    await expect(
      svc.suspendRealCredential('SX-7A31-C0E4-19F6'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
    });
  });

  it('honestly rejects a reissue (no such lifecycle transition exists)', async () => {
    const svc = await loadRealService();

    await expect(
      svc.reissueRealCredential('SX-7A31-C0E4-19F6', {
        newCredentialId: 'SX-NEW0-0000-0000',
        newCredentialHash: 'a'.repeat(64),
      }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honestly rejects issuer suspend/activate (the ledger governs issuer status)', async () => {
    const svc = await loadRealService();

    await expect(svc.suspendRealIssuer('issuer-1', 'policy review')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
    });
    await expect(svc.activateRealIssuer('issuer-1', 'restore')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Issuers
  // -------------------------------------------------------------------------

  it('lists issuers with credential counts derived from issuer history', async () => {
    const svc = await loadRealService();
    fetchMock
      .mockResolvedValueOnce(fakeApi([sampleIssuer]))
      .mockResolvedValueOnce(fakeApi(sampleIssuerHistory));

    const issuers = await svc.getRealIssuers();

    expect(callUrl(0)).toContain('/blockchain/issuers');
    expect(callUrl(1)).toContain('/blockchain/issuers/issuer-1/history');
    expect(issuers).toHaveLength(1);
    expect(issuers[0]!.name).toBe('SecureX Demo University');
    expect(issuers[0]!.status).toBe('ACTIVE');
    expect(issuers[0]!.credentialsIssued).toBe(2);
  });

  it('never presents an unrecognized chain issuer status as ACTIVE', async () => {
    const svc = await loadRealService();
    fetchMock
      .mockResolvedValueOnce(
        fakeApi([{ ...sampleIssuer, status: 'SOMETHING_NEW' }]),
      )
      .mockResolvedValueOnce(fakeApi(sampleIssuerHistory));

    const issuers = await svc.getRealIssuers();
    expect(issuers[0]!.status).toBe('SUSPENDED');
  });

  it('reports zero credentials when issuer history is unavailable', async () => {
    const svc = await loadRealService();
    fetchMock
      .mockResolvedValueOnce(fakeApi([sampleIssuer]))
      .mockRejectedValue(new Error('history unavailable'));

    const issuers = await svc.getRealIssuers();
    expect(issuers[0]!.credentialsIssued).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Audit / operational reads
  // -------------------------------------------------------------------------

  it('maps audit events and derives a display role from the acting identity', async () => {
    const svc = await loadRealService();
    const events: ChainAuditEventDto[] = [
      {
        id: 'evt-1',
        type: 'CREDENTIAL_SUSPENDED',
        timestamp: '2024-02-01T00:00:00.000Z',
        severity: 'WARNING',
        message: 'Credential suspended for review',
        referenceType: 'credential',
        referenceId: 'SX-7A31-C0E4-19F6',
        actor: 'issuer-1',
      },
    ];
    fetchMock.mockResolvedValueOnce(fakeApi(events));

    const audit = await svc.getRealAuditEvents();

    expect(callUrl(0)).toContain('/blockchain/audit/events?limit=100&offset=0');
    expect(audit[0]!.action).toBe('CREDENTIAL_SUSPENDED');
    expect(audit[0]!.actorRole).toBe('ISSUER');
    expect(audit[0]!.target).toBe('SX-7A31-C0E4-19F6');
    expect(audit[0]!.targetType).toBe('credential');
  });

  it('reports null health and state instead of throwing when the chain is unreachable', async () => {
    const svc = await loadRealService();
    const health: ChainHealthDto = {
      status: 'UP',
      height: 100,
      peerCount: 3,
      nodeVersion: 'v3.1.0',
      protocolVersion: '3.1',
      checkedAt: '2024-01-01T00:00:00.000Z',
    };
    const state: ChainStateDto = {
      height: 100,
      issuers: 2,
      credentials: 9,
      validators: 5,
      keys: 5,
    };
    fetchMock.mockResolvedValueOnce(fakeApi(health)).mockResolvedValueOnce(fakeApi(state));

    expect((await svc.getBackendHealth())?.height).toBe(100);
    expect((await svc.getRealStateSummary())?.credentials).toBe(9);

    fetchMock.mockImplementation(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await svc.getBackendHealth()).toBeNull();
    expect(await svc.getRealStateSummary()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Transport contract
  // -------------------------------------------------------------------------

  it('sends the Platform API session token and nothing else', async () => {
    const svc = await loadRealService();
    localStorage.setItem('securex_auth_token', 'tkn-session');
    // A blockchain service credential must never be configurable from the
    // browser: even if one is present in the environment it is not sent.
    vi.stubEnv('VITE_BLOCKCHAIN_AUTH_TOKEN', 'tkn-principal');
    fetchMock.mockResolvedValueOnce(fakeApi(sampleCredential));

    await svc.getRealCredential('SX-7A31-C0E4-19F6');

    const headers = new Headers(fetchMock.mock.calls[0]![1].headers);
    expect(headers.get('Authorization')).toBe('Bearer tkn-session');
  });

  it('never contacts a blockchain service host directly', async () => {
    const svc = await loadRealService();
    fetchMock.mockResolvedValue(fakeApi(sampleCredential));

    await svc.getRealCredential('SX-7A31-C0E4-19F6');

    for (const call of fetchMock.mock.calls) {
      const url = String(call[0]);
      expect(url.startsWith(API_BASE_URL)).toBe(true);
      expect(url).not.toContain('BLOCKCHAIN_API_URL');
    }
  });

  it('throws an ApiError status 0 when the network is unreachable', async () => {
    const svc = await loadRealService();
    fetchMock.mockImplementation(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(svc.getRealCredential('SX-7A31-C0E4-19F6')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'Unable to reach the service. Please check your connection and try again.',
    });
  });
});
