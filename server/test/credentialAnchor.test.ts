import assert from 'node:assert/strict';
import { after, beforeEach, describe, it, mock } from 'node:test';

// The anchor service reads its chain configuration from the environment at
// module load, so the variables must exist before it is imported.
process.env.APP_ENV = 'test';
process.env.BLOCKCHAIN_API_URL = 'http://blockchain.test';
process.env.BLOCKCHAIN_AUTH_TOKEN = 'test-token-not-a-real-secret';
// Short per-request timeout so the "chain is unreachable" cases fail fast
// rather than burning the client's full retry window.
process.env.BLOCKCHAIN_TIMEOUT_MS = '2000';
// Deliberately short so the "submitted but not confirmed" path is exercised
// without a wall-clock penalty.
process.env.BLOCKCHAIN_ANCHOR_TIMEOUT_MS = '5000';
process.env.BLOCKCHAIN_ISSUER_ID = 'securex-issuer';

const {
  canonicalCredentialDocument,
  hashCredentialDocument,
  anchorCredential,
  anchorRevocation,
  readChainEvidence,
} = await import('../services/credentialAnchor.js');
type AnchorableCredential = import('../services/credentialAnchor.js').AnchorableCredential;

type FetchCall = { url: string; init: RequestInit | undefined };

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

/** Installs a fetch stub that routes by path, recording every call. */
function stubFetch(routes: Record<string, (call: FetchCall, index: number) => Response | Promise<Response>>) {
  const calls: FetchCall[] = [];
  mock.method(globalThis, 'fetch', async (input: unknown, init?: RequestInit) => {
    const call = { url: String(input), init };
    const index = calls.length;
    calls.push(call);
    const path = new URL(call.url).pathname;
    const route = routes[path];
    if (!route) throw new Error(`unstubbed route: ${path}`);
    return route(call, index);
  });
  return calls;
}

const CREDENTIAL = {
  credentialId: 'SX-1111-2222-3333',
  type: 'Degree',
  title: 'Master of Secure Systems',
  description: 'A test credential.',
  holderName: 'Emily Rodriguez',
  issuerName: 'Stanford Online Learning',
  institutionName: 'Stanford University',
  issuedAt: '2026-01-15T10:00:00.000Z',
  expiresAt: null,
};

/** A chain receipt that reports an issuer-signed issuance. */
const SUBMISSION = {
  id: 'tx-abc',
  hash: 'b'.repeat(64),
  submitted: true,
  issuerSigned: true,
};

/** Chain evidence for a committed, proof-verified anchor. */
function evidence(overrides: Record<string, unknown> = {}) {
  return {
    available: true,
    verification: {
      status: 'VALID',
      credentialId: CREDENTIAL.credentialId,
      credentialHash: hashCredentialDocument(CREDENTIAL),
      issuer: { issuerId: 'securex-issuer', name: 'SecureX Issuing Authority', status: 'ACTIVE' },
      lifecycle: { issuedAt: CREDENTIAL.issuedAt, lastUpdated: CREDENTIAL.issuedAt, version: '1.0.0' },
      proof: {
        transactionId: 'tx-abc',
        transactionHash: 'b'.repeat(64),
        leafHash: hashCredentialDocument(CREDENTIAL),
        leafIndex: 0,
        proof: [],
        merkleRoot: 'c'.repeat(64),
        blockHeight: 3,
        blockHash: 'd'.repeat(64),
        blockPreviousHash: 'e'.repeat(64),
        blockTimestamp: '2026-01-15T10:00:05.000Z',
        blockProposer: 'c1f4fd78',
        verified: true,
      },
      issuerSignatureValid: true,
      keyStatus: 'ACTIVE',
      protocolCompatible: true,
      verifiedAt: '2026-01-15T10:00:06.000Z',
      ...overrides,
    },
  };
}

/**
 * Runs the anchor polling loop against a virtual clock.
 *
 * `anchorCredential` waits up to BLOCKCHAIN_ANCHOR_TIMEOUT_MS (5s here) for the
 * chain to commit a proof. Exercising that in real time would add seconds to the
 * suite per test, so the clock is faked instead — the timing behaviour (poll,
 * then give up as PENDING) is exactly what is under test.
 */
async function runOnVirtualClock<T>(operation: () => Promise<T>): Promise<T> {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const pending = operation();
    // The window is 5s of virtual time with a 1.5s poll interval, so ~20s of
    // headroom guarantees the loop exits on its deadline rather than hanging.
    for (let i = 0; i < 20; i += 1) {
      await mock.timers.tick(1_000);
    }
    return await pending;
  } finally {
    mock.timers.reset();
  }
}

describe('canonical credential document', () => {
  it('produces the same hash regardless of property insertion order', () => {
    const reordered = Object.fromEntries(
      Object.entries(CREDENTIAL).reverse(),
    ) as unknown as AnchorableCredential;
    assert.equal(canonicalCredentialDocument(reordered), canonicalCredentialDocument(CREDENTIAL));
    assert.equal(hashCredentialDocument(reordered), hashCredentialDocument(CREDENTIAL));
  });

  it('is lowercase hex of the expected length', () => {
    assert.match(hashCredentialDocument(CREDENTIAL), /^[0-9a-f]{64}$/);
  });

  it('changes when any single field changes', () => {
    const baseline = hashCredentialDocument(CREDENTIAL);
    for (const field of Object.keys(CREDENTIAL) as (keyof typeof CREDENTIAL)[]) {
      const mutated: AnchorableCredential = {
        ...CREDENTIAL,
        [field]: field === 'expiresAt' ? '2030-01-01T00:00:00.000Z' : `${String(CREDENTIAL[field])}-tampered`,
      };
      assert.notEqual(hashCredentialDocument(mutated), baseline, `mutating ${field} must change the hash`);
    }
  });

  it('treats an absent expiry the same as an explicit null', () => {
    // Both mean "this credential does not expire", so both must hash the same:
    // a holder whose expiry is later cleared must not appear tampered with.
    assert.equal(
      hashCredentialDocument({ ...CREDENTIAL, expiresAt: null }),
      hashCredentialDocument({ ...CREDENTIAL, expiresAt: undefined as never }),
    );
  });

  it('is deterministic across repeated calls', () => {
    assert.equal(hashCredentialDocument(CREDENTIAL), hashCredentialDocument({ ...CREDENTIAL }));
  });
});

describe('anchorCredential', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  after(() => {
    mock.restoreAll();
  });

  it('reports ANCHORED with only chain-derived block data', async () => {
    const calls = stubFetch({
      '/credentials': () => jsonResponse(202, SUBMISSION),
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () => jsonResponse(200, evidence()),
    });

    const result = await anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL));

    assert.equal(result.status, 'ANCHORED');
    assert.equal(result.blockHeight, 3);
    assert.equal(result.merkleRoot, 'c'.repeat(64));
    assert.equal(result.blockHash, 'd'.repeat(64));
    assert.equal(result.txHash, 'b'.repeat(64));
    assert.equal(result.chainTxId, 'tx-abc');
    assert.equal(result.chainIssuerId, 'securex-issuer');
    assert.equal(result.issuerSignatureValid, true);
    assert.equal(result.proofVerified, true);
    assert.equal(result.error, null);

    // Only the hash reaches the chain: the holder's name and credential text are
    // never transmitted.
    const body = JSON.parse(String(calls[0]?.init?.body));
    assert.equal(body.credentialHash, hashCredentialDocument(CREDENTIAL));
    assert.equal(body.issuerId, 'securex-issuer');
    assert.ok(!JSON.stringify(body).includes('Emily Rodriguez'));
    assert.ok(!JSON.stringify(body).includes('Master of Secure Systems'));
  });

  it('accepts a version-1 single-transaction block root, which is 32 hex characters', async () => {
    // `computeMerkleRoot` seeds version-1 blocks with `tx.id`, and
    // `MerkleTree.getRoot` returns the sole leaf unchanged, so a version-1 block
    // holding one transaction roots to that transaction id: 32 characters.
    // Demanding 64 here reported a committed production anchor as PENDING
    // forever, so both widths must be accepted.
    const root = '216a04a4f336bf37883027e0ed6ef092';
    stubFetch({
      '/credentials': () => jsonResponse(202, SUBMISSION),
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () =>
        jsonResponse(
          200,
          evidence({ proof: { ...evidence().verification.proof, merkleRoot: root, blockVersion: 1 } }),
        ),
    });

    const result = await anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL));

    assert.equal(result.status, 'ANCHORED');
    assert.equal(result.merkleRoot, root);
    assert.equal(result.blockHeight, 3);
    assert.equal(result.proofVerified, true);
    assert.equal(result.error, null);
  });

  it('reports PENDING, not ANCHORED, while the proof is unverified', async () => {
    stubFetch({
      '/credentials': () => jsonResponse(202, SUBMISSION),
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () =>
        jsonResponse(200, evidence({ proof: { ...evidence().verification.proof, verified: false } })),
    });

    const result = await runOnVirtualClock(() =>
      anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL)),
    );

    assert.equal(result.status, 'PENDING');
    assert.equal(result.merkleRoot, null, 'an unverified proof must not be reported as a root');
    // `null`, not `false`: the aggregate PENDING result says no verified proof
    // was obtained within the window. It deliberately does not upgrade that into
    // a finding about the chain.
    assert.equal(result.proofVerified, null);
    assert.ok(result.error);
  });

  it('reports PENDING while the chain has no verification result yet', async () => {
    stubFetch({
      '/credentials': () => jsonResponse(202, SUBMISSION),
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () => jsonResponse(404, { error: 'NOT_FOUND' }),
    });

    const result = await runOnVirtualClock(() =>
      anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL)),
    );

    assert.equal(result.status, 'PENDING');
    assert.equal(result.txHash, null);
    assert.equal(result.blockHeight, null);
  });

  it('reports UNAVAILABLE when the chain rejects the submission', async () => {
    stubFetch({
      '/credentials': () => jsonResponse(403, { error: 'FORBIDDEN', message: 'Issuer key unavailable' }),
    });

    const result = await anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL));

    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.chainTxId, null);
    assert.equal(result.txHash, null);
    assert.equal(result.merkleRoot, null);
    assert.equal(result.blockHeight, null);
    assert.equal(result.blockHash, null);
    assert.equal(result.issuerSignatureValid, null);
    assert.equal(result.proofVerified, null);
    assert.ok(result.error);
  });

  it('reports UNAVAILABLE when the chain does not confirm acceptance', async () => {
    stubFetch({
      '/credentials': () => jsonResponse(200, { id: 'tx-abc', submitted: false }),
    });

    const result = await anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL));

    assert.equal(result.status, 'UNAVAILABLE');
    assert.ok(result.error);
  });

  it('never throws when the chain is completely unreachable', async () => {
    stubFetch({
      '/credentials': () => {
        throw new Error('ECONNREFUSED');
      },
    });

    const result = await anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL));
    assert.equal(result.status, 'UNAVAILABLE');
    assert.ok(result.error);
  });

  it('still anchors when the chain reports a non-issuer-signed issuance', async () => {
    // The chain accepted the anchor but signed with the node validator key. The
    // anchor exists, so the real block data is recorded — but the receipt's
    // issuerSignatureValid: false is carried through rather than smoothed over.
    stubFetch({
      '/credentials': () => jsonResponse(202, { ...SUBMISSION, issuerSigned: false }),
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () =>
        jsonResponse(200, evidence({ issuerSignatureValid: false })),
    });

    const result = await anchorCredential(CREDENTIAL, hashCredentialDocument(CREDENTIAL));

    assert.equal(result.status, 'ANCHORED');
    assert.equal(result.issuerSignatureValid, false, 'a non-issuer-signed anchor is not a verified signature');
  });
});

describe('anchorRevocation', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('reports ANCHORED without inventing a document hash', async () => {
    stubFetch({
      [`/credentials/${encodeURIComponent(CREDENTIAL.credentialId)}/revoke`]: () => jsonResponse(202, SUBMISSION),
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () =>
        jsonResponse(200, evidence({ status: 'REVOKED' })),
    });

    const result = await anchorRevocation(CREDENTIAL.credentialId);

    assert.equal(result.status, 'ANCHORED');
    // A revocation carries no document, so it owns no document hash. It must be
    // null, never an empty string masquerading as a hash.
    assert.equal(result.credentialHash, null);
    assert.equal(result.chainIssuerId, 'securex-issuer');
  });

  it('reports UNAVAILABLE when the revocation is refused', async () => {
    stubFetch({
      [`/credentials/${encodeURIComponent(CREDENTIAL.credentialId)}/revoke`]: () =>
        jsonResponse(409, { error: 'CONFLICT', message: 'Credential is not ACTIVE' }),
    });

    const result = await anchorRevocation(CREDENTIAL.credentialId);
    assert.equal(result.status, 'UNAVAILABLE');
    assert.equal(result.credentialHash, null);
    assert.ok(result.error);
  });
});

describe('readChainEvidence', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns the chain payload verbatim', async () => {
    stubFetch({
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () => jsonResponse(200, evidence()),
    });
    const result = await readChainEvidence(CREDENTIAL.credentialId);
    assert.equal('unavailable' in result, false);
  });

  it('reports unavailable instead of throwing when the chain is down', async () => {
    stubFetch({
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () => {
        throw new Error('ECONNREFUSED');
      },
    });
    const result = await readChainEvidence(CREDENTIAL.credentialId);
    assert.equal('unavailable' in result, true);
    if ('unavailable' in result) assert.ok(result.reason);
  });

  it('reports notOnChain when the chain answers that it holds no record', async () => {
    stubFetch({
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () =>
        jsonResponse(404, { error: 'NOT_FOUND', message: 'Credential not found' }),
    });
    const result = await readChainEvidence(CREDENTIAL.credentialId);
    // An answer is not a connectivity failure. Collapsing these two would make a
    // never-anchored credential look like an outage.
    assert.equal('notOnChain' in result, true);
    assert.equal('unavailable' in result, false);
  });

  it('still reports unavailable for a non-404 chain error', async () => {
    stubFetch({
      [`/evidence/${encodeURIComponent(CREDENTIAL.credentialId)}`]: () =>
        jsonResponse(403, { error: 'FORBIDDEN' }),
    });
    const result = await readChainEvidence(CREDENTIAL.credentialId);
    assert.equal('unavailable' in result, true);
    assert.equal('notOnChain' in result, false);
  });
});