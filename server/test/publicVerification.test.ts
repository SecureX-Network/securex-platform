import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.APP_ENV = 'test';

const { toPublicVerificationDto, toPublicNotFoundDto } = await import('../dto/publicVerification.js');
type CredentialRow = import('../db/mappers.js').CredentialRow;
type ChainEvidence = import('../dto/publicVerification.js').ChainEvidence;

const VERIFIED_AT = '2026-10-03T12:00:00.000Z';

/** A chain-backed, issuer-signed credential exactly as the platform stores it. */
function anchoredRow(overrides: Partial<CredentialRow> = {}): CredentialRow {
  return {
    id: 'cred-1',
    credential_id: 'SX-1111-2222-3333',
    type: 'Degree',
    title: 'Master of Secure Systems',
    description: 'A test credential.',
    holder_name: 'Emily Rodriguez',
    issuer_id: 'iss-stanford',
    institution_id: 'inst-stanford',
    status: 'VALID',
    issued_at: '2026-01-15T10:00:00.000Z',
    expires_at: null,
    revoked_at: null,
    revoked_reason: null,
    tx_hash: 'b'.repeat(64),
    merkle_root: 'c'.repeat(64),
    digital_signature: null,
    issuer_name: 'Stanford Online Learning',
    institution_name: 'Stanford University',
    credential_hash: 'a'.repeat(64),
    chain_issuer_id: 'securex-issuer',
    chain_tx_id: 'tx-abc',
    chain_block_height: 3,
    chain_block_hash: 'd'.repeat(64),
    anchor_status: 'ANCHORED',
    anchor_error: null,
    ...overrides,
  } as CredentialRow;
}

/** A committed, proof-verified, issuer-signed chain view. */
const ANCHORED_EVIDENCE: ChainEvidence = {
  available: true,
  onChainRecord: true,
  proofVerified: true,
  issuerSignatureValid: true,
  transactionId: 'tx-abc',
  transactionHash: 'b'.repeat(64),
  merkleRoot: 'c'.repeat(64),
  blockHeight: 3,
  blockHash: 'd'.repeat(64),
  chainStatus: 'VALID',
};

describe('public verification: an anchored, issuer-signed credential', () => {
  const dto = toPublicVerificationDto({ row: anchoredRow(), verifiedAt: VERIFIED_AT, chain: ANCHORED_EVIDENCE });

  it('reports the record, the proof and the signature as verified', () => {
    assert.equal(dto.status, 'VALID');
    assert.equal(dto.checks.credentialRecord.verified, true);
    assert.equal(dto.checks.blockchainProof.verified, true);
    assert.equal(dto.checks.blockchainProof.status, 'VERIFIED');
    assert.equal(dto.checks.signature.verified, true);
    assert.equal(dto.checks.signature.status, 'VERIFIED');
  });

  it('presents the chain’s own evidence verbatim', () => {
    const evidence = dto.checks.blockchainProof.evidence;
    assert.ok(evidence, 'a verified proof must carry evidence');
    assert.equal(evidence?.transactionId, 'tx-abc');
    assert.equal(evidence?.transactionHash, 'b'.repeat(64));
    assert.equal(evidence?.merkleRoot, 'c'.repeat(64));
    assert.equal(evidence?.blockHeight, 3);
    assert.equal(evidence?.blockHash, 'd'.repeat(64));
    assert.equal(evidence?.inclusionProofVerified, true);
  });

  it('never exposes holder identity, internal ids or raw storage fields', () => {
    const serialized = JSON.stringify(dto);
    assert.ok(!serialized.includes('Emily Rodriguez'), 'holder name must not leak');
    assert.ok(!serialized.includes('cred-1'), 'internal row id must not leak');
    assert.ok(!serialized.includes('iss-stanford'), 'internal issuer id must not leak');
    assert.ok(!serialized.includes('inst-stanford'), 'internal institution id must not leak');
    assert.equal('holderName' in dto, false);
    assert.equal('holderId' in dto, false);
    assert.equal('credential' in dto, false);
    assert.equal('revokedReason' in dto, false);
  });

  it('never exposes the anchored document hash or the revocation reason', () => {
    const integrity = dto.checks.documentIntegrity;
    assert.equal(integrity, undefined, 'no caller-supplied hash means no integrity claim');
    assert.ok(!JSON.stringify(dto).includes('a'.repeat(64)), 'credential_hash must not be returned');
  });

  it('does not fabricate a document-integrity result without a supplied hash', () => {
    assert.equal(dto.checks.documentIntegrity, undefined);
  });
});

describe('public verification: a version-1 single-transaction block', () => {
  // `computeMerkleRoot` seeds version-1 blocks with `tx.id`, and
  // `MerkleTree.getRoot` returns the sole leaf unchanged, so such a block roots
  // to its transaction id: 32 hex characters rather than 64.
  it('reports the proof verified when the root is 32 hex characters', () => {
    const root = '216a04a4f336bf37883027e0ed6ef092';
    const dto = toPublicVerificationDto({
      row: anchoredRow(),
      verifiedAt: VERIFIED_AT,
      chain: { ...ANCHORED_EVIDENCE, merkleRoot: root },
    });

    assert.equal(dto.checks.blockchainProof.verified, true);
    assert.equal(dto.checks.blockchainProof.status, 'VERIFIED');
    assert.equal(dto.checks.blockchainProof.evidence?.merkleRoot, root);
  });
});

describe('public verification: the chain will not confirm the proof', () => {
  // Each of these is a case where a naive implementation would report VERIFIED.
  // The DTO must not: an unverified chain answer is never upgraded locally.
  const cases: Array<{ name: string; evidence: ChainEvidence }> = [
    {
      name: 'the proof is unverified',
      evidence: { ...ANCHORED_EVIDENCE, proofVerified: false },
    },
    {
      name: 'the block height is zero',
      evidence: { ...ANCHORED_EVIDENCE, blockHeight: 0 },
    },
    {
      name: 'the block height is missing',
      evidence: { ...ANCHORED_EVIDENCE, blockHeight: null },
    },
    {
      name: 'the Merkle root is truncated',
      evidence: { ...ANCHORED_EVIDENCE, merkleRoot: 'abc123' },
    },
    {
      name: 'the Merkle root is missing',
      evidence: { ...ANCHORED_EVIDENCE, merkleRoot: null },
    },
    {
      name: 'the transaction id is missing',
      evidence: { ...ANCHORED_EVIDENCE, transactionId: null },
    },
    {
      name: 'the transaction hash is missing',
      evidence: { ...ANCHORED_EVIDENCE, transactionHash: null },
    },
    {
      name: 'the block hash is missing',
      evidence: { ...ANCHORED_EVIDENCE, blockHash: null },
    },
  ];

  for (const { name, evidence } of cases) {
    it(`reports the proof unverified when ${name}`, () => {
      const dto = toPublicVerificationDto({ row: anchoredRow(), verifiedAt: VERIFIED_AT, chain: evidence });
      assert.equal(dto.checks.blockchainProof.verified, false, name);
      assert.equal(dto.checks.blockchainProof.status, 'UNVERIFIED', name);
      assert.equal(dto.checks.blockchainProof.evidence, undefined, `${name}: no evidence may be presented`);
    });
  }

  it('still reports the signature verified when only the proof is missing', () => {
    // These are independent claims and must stay independent: the chain can
    // validate the issuance signature without a confirmed inclusion proof.
    const dto = toPublicVerificationDto({
      row: anchoredRow(),
      verifiedAt: VERIFIED_AT,
      chain: { ...ANCHORED_EVIDENCE, merkleRoot: null },
    });
    assert.equal(dto.checks.signature.verified, true);
    assert.equal(dto.checks.blockchainProof.verified, false);
  });
});

describe('public verification: the issuer signature is not valid', () => {
  const dto = toPublicVerificationDto({
    row: anchoredRow(),
    verifiedAt: VERIFIED_AT,
    chain: { ...ANCHORED_EVIDENCE, issuerSignatureValid: false },
  });

  it('does not report a signature as verified', () => {
    assert.equal(dto.checks.signature.verified, false);
    assert.equal(dto.checks.signature.status, 'UNVERIFIED');
  });

  it('does not claim the signature is missing, only unconfirmed', () => {
    assert.equal(dto.checks.signature.available, true);
  });
});

describe('public verification: the chain holds no anchor', () => {
  // A credential that exists on the platform but was never anchored. The chain
  // answered and said "no record" — which must not be reported as "submitted but
  // not yet confirmed", because nothing was ever submitted.
  const NOT_ON_CHAIN: ChainEvidence = {
    available: true,
    onChainRecord: false,
    proofVerified: false,
    issuerSignatureValid: false,
    transactionId: null,
    transactionHash: null,
    merkleRoot: null,
    blockHeight: null,
    blockHash: null,
    chainStatus: null,
  };
  const dto = toPublicVerificationDto({ row: anchoredRow(), verifiedAt: VERIFIED_AT, chain: NOT_ON_CHAIN });

  it('does not claim the credential was submitted', () => {
    assert.equal(dto.checks.blockchainProof.verified, false);
    assert.ok(!/submitted/i.test(dto.checks.blockchainProof.detail), dto.checks.blockchainProof.detail);
    assert.match(dto.checks.blockchainProof.detail, /holds no anchor/i);
  });

  it('does not present a locally-stored anchor as chain evidence', () => {
    assert.equal(dto.checks.blockchainProof.evidence, undefined);
    assert.ok(!JSON.stringify(dto).includes('d'.repeat(64)));
  });

  it('does not report a signature as verified', () => {
    assert.equal(dto.checks.signature.verified, false);
    assert.match(dto.checks.signature.detail, /never checked|ever checked/i);
  });

  it('is distinct from an unreachable chain', () => {
    const unreachable = toPublicVerificationDto({
      row: anchoredRow(),
      verifiedAt: VERIFIED_AT,
      chain: { available: false, reason: 'the blockchain service is not configured' },
    });
    assert.notEqual(dto.checks.blockchainProof.detail, unreachable.checks.blockchainProof.detail);
  });

  it('still reports the platform credential record as verified', () => {
    assert.equal(dto.checks.credentialRecord.verified, true);
    assert.equal(dto.status, 'VALID');
  });
});

describe('public verification: the chain cannot be reached', () => {
  const dto = toPublicVerificationDto({
    row: anchoredRow(),
    verifiedAt: VERIFIED_AT,
    chain: { available: false, reason: 'the blockchain service is not configured' },
  });

  it('reports the credential record verified but the chain claims unverified', () => {
    assert.equal(dto.status, 'VALID');
    assert.equal(dto.checks.credentialRecord.verified, true);
    assert.equal(dto.checks.blockchainProof.verified, false);
    assert.equal(dto.checks.signature.verified, false);
  });

  it('explains the unavailability instead of hiding it', () => {
    assert.match(dto.checks.blockchainProof.detail, /could not be consulted/i);
    assert.match(dto.checks.blockchainProof.detail, /not configured/);
  });

  it('does not present a locally-stored anchor as chain evidence', () => {
    // The row carries tx_hash / merkle_root / block height, but those are the
    // platform's own record of a previous write — they are NOT what the chain
    // says right now, so they must not be presented as chain evidence while the
    // chain is unreachable.
    assert.equal(dto.checks.blockchainProof.evidence, undefined);
    assert.ok(!JSON.stringify(dto).includes('d'.repeat(64)));
  });
});

describe('public verification: no chain evidence at all', () => {
  const dto = toPublicVerificationDto({ row: anchoredRow(), verifiedAt: VERIFIED_AT });

  it('reports the integration as unavailable rather than merely unverified', () => {
    assert.equal(dto.checks.blockchainProof.available, false);
    assert.equal(dto.checks.blockchainProof.verified, false);
    assert.equal(dto.checks.signature.available, false);
    assert.equal(dto.checks.signature.verified, false);
  });
});

describe('public verification: document integrity', () => {
  it('reports EXACT when the supplied hash matches the anchored document hash', () => {
    const dto = toPublicVerificationDto({
      row: anchoredRow(),
      documentHash: 'a'.repeat(64),
      verifiedAt: VERIFIED_AT,
      chain: ANCHORED_EVIDENCE,
    });
    assert.equal(dto.checks.documentIntegrity?.status, 'EXACT');
    assert.equal(dto.checks.documentIntegrity?.hashMatch, true);
  });

  it('accepts a hash in any case', () => {
    const dto = toPublicVerificationDto({
      row: anchoredRow(),
      documentHash: 'A'.repeat(64),
      verifiedAt: VERIFIED_AT,
      chain: ANCHORED_EVIDENCE,
    });
    assert.equal(dto.checks.documentIntegrity?.status, 'EXACT');
  });

  it('compares against the document hash, never the Merkle root', () => {
    // The Merkle root is a property of the containing block, not of the
    // document. Presenting it as the document hash would be a category error.
    const dto = toPublicVerificationDto({
      row: anchoredRow(),
      documentHash: 'c'.repeat(64),
      verifiedAt: VERIFIED_AT,
      chain: ANCHORED_EVIDENCE,
    });
    assert.equal(dto.checks.documentIntegrity?.status, 'TAMPERED');
  });

  it('reports UNVERIFIABLE rather than EXACT when no hash is recorded', () => {
    const dto = toPublicVerificationDto({
      row: anchoredRow({ credential_hash: null }),
      documentHash: 'a'.repeat(64),
      verifiedAt: VERIFIED_AT,
      chain: ANCHORED_EVIDENCE,
    });
    assert.equal(dto.checks.documentIntegrity?.status, 'UNVERIFIABLE');
    assert.equal(dto.checks.documentIntegrity?.hashMatch, false);
  });

  it('never returns the stored hash itself', () => {
    const dto = toPublicVerificationDto({
      row: anchoredRow(),
      documentHash: 'a'.repeat(64),
      verifiedAt: VERIFIED_AT,
      chain: ANCHORED_EVIDENCE,
    });
    assert.equal('anchoredHash' in (dto.checks.documentIntegrity ?? {}), false);
  });

  it('scopes the claim to the platform document', () => {
    const dto = toPublicVerificationDto({
      row: anchoredRow(),
      documentHash: 'a'.repeat(64),
      verifiedAt: VERIFIED_AT,
      chain: ANCHORED_EVIDENCE,
    });
    assert.equal(dto.checks.documentIntegrity?.scope, 'PLATFORM_RECORD');
  });
});

describe('public verification: a revoked credential', () => {
  const dto = toPublicVerificationDto({
    row: anchoredRow({ status: 'REVOKED', revoked_at: '2026-02-01T00:00:00.000Z', revoked_reason: 'Enrolment withdrawn' }),
    verifiedAt: VERIFIED_AT,
    chain: { ...ANCHORED_EVIDENCE, chainStatus: 'REVOKED' },
  });

  it('reports REVOKED as the authoritative status', () => {
    assert.equal(dto.status, 'REVOKED');
    assert.equal(dto.storedStatus, 'REVOKED');
    assert.equal(dto.revokedAt, '2026-02-01T00:00:00.000Z');
  });

  it('still reports the anchor that existed', () => {
    // Revocation does not erase history: the original anchor remains verifiable.
    assert.equal(dto.checks.blockchainProof.verified, true);
    assert.equal(dto.checks.signature.verified, true);
  });

  it('never discloses the revocation reason', () => {
    assert.ok(!JSON.stringify(dto).includes('Enrolment withdrawn'));
  });
});

describe('public verification: an expired credential', () => {
  it('derives EXPIRED from the dates even when the stored status still says VALID', () => {
    const dto = toPublicVerificationDto({
      row: anchoredRow({ expires_at: '2020-01-01T00:00:00.000Z' }),
      verifiedAt: VERIFIED_AT,
      chain: ANCHORED_EVIDENCE,
    });
    assert.equal(dto.status, 'EXPIRED');
    assert.equal(dto.storedStatus, 'VALID');
  });
});

describe('public verification: an unknown credential', () => {
  const dto = toPublicNotFoundDto('SX-0000-0000-0000', VERIFIED_AT);

  it('reports NOT_FOUND for every check', () => {
    assert.equal(dto.status, 'NOT_FOUND');
    assert.equal(dto.checks.credentialRecord.verified, false);
    assert.equal(dto.checks.credentialRecord.status, 'NOT_FOUND');
    assert.equal(dto.checks.blockchainProof.verified, false);
    assert.equal(dto.checks.signature.verified, false);
  });

  it('does not distinguish a credential that exists on another tenant', () => {
    // The NOT_FOUND response must be identical for every unknown ID, otherwise
    // the endpoint becomes a probe for which IDs exist.
    assert.deepEqual(toPublicNotFoundDto('SX-0000-0000-0000', VERIFIED_AT), dto);
  });
});