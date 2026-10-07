import { createHash } from 'node:crypto';
import { serverConfig } from '../config.js';
import { logger } from './logger.js';
import {
  blockchainClient,
  type ApiCredentialEvidence,
  type ApiTransactionSubmission,
} from './blockchain.js';
import { isMerkleRoot } from '../utils/merkle.js';

// ---------------------------------------------------------------------------
// CREDENTIAL ANCHORING
//
// Turns a platform credential into a real, verifiable on-chain anchor, and
// reports exactly what happened.
//
// Design constraints, all of them deliberate:
//
//   * ONLY THE HASH LEAVES THE PLATFORM. The chain stores `credentialHash`, so
//     holder names, emails and credential text never reach the ledger.
//
//   * NEVER FABRICATED. Every field in `AnchorResult` comes from a response the
//     chain actually returned, or it is null with an explicit reason. A chain
//     that is down produces `status: 'UNAVAILABLE'`, never a placeholder hash.
//
//   * ISSUER SIGNATURE IS THE POINT. The chain custodies the issuer private key
//     (this platform never sees it). The receipt tells us whether the anchor was
//     actually issuer-signed; if it was not, the credential would verify as
//     INVALID forever, so that is surfaced rather than assumed away.
//
//   * SUBMISSION IS NOT COMMITMENT. A receipt only means the transaction entered
//     the mempool. We wait for the block so the reported height, block hash and
//     Merkle root are real committed values, and if the wait expires the result
//   is PENDING — still not a verified anchor.
// ---------------------------------------------------------------------------

export type AnchorStatus = 'ANCHORED' | 'PENDING' | 'UNAVAILABLE';

export interface AnchorResult {
  status: AnchorStatus;
  /**
   * SHA-256 of the canonical document, computed locally and never guessed.
   *
   * Null only for lifecycle events (revocation) that do not own the document
   * hash; it is never an empty string standing in for a hash.
   */
  credentialHash: string | null;
  /** On-chain issuer identity that signed. */
  chainIssuerId: string;
  chainTxId: string | null;
  /** Chain transaction hash. */
  txHash: string | null;
  /** Merkle root of the block containing the anchor. */
  merkleRoot: string | null;
  blockHeight: number | null;
  blockHash: string | null;
  /** Whether the chain reports the issuer signature as valid. */
  issuerSignatureValid: boolean | null;
  /** Whether the chain verified the Merkle inclusion path. */
  proofVerified: boolean | null;
  /** Safe failure summary; never contains the service credential. */
  error: string | null;
}

/**
 * Canonical credential document.
 *
 * Field order is fixed and values are normalized, so the same credential always
 * produces the same hash. This matters: `documentIntegrity` on the public
 * verification endpoint compares a caller-supplied hash against this value, so an
 * unstable hash would report false tampering.
 */
export interface AnchorableCredential {
  credentialId: string;
  type: string;
  title: string;
  description: string;
  holderName: string;
  issuerName: string;
  institutionName: string;
  issuedAt: string;
  expiresAt: string | null;
}

export function canonicalCredentialDocument(input: AnchorableCredential): string {
  return JSON.stringify([
    ['credentialId', input.credentialId],
    ['type', input.type],
    ['title', input.title],
    ['description', input.description],
    ['holderName', input.holderName],
    ['issuerName', input.issuerName],
    ['institutionName', input.institutionName],
    ['issuedAt', input.issuedAt],
    ['expiresAt', input.expiresAt],
  ]);
}

/** SHA-256 of the canonical document, lowercase hex — the chain's expected form. */
export function hashCredentialDocument(input: AnchorableCredential): string {
  return createHash('sha256').update(canonicalCredentialDocument(input), 'utf8').digest('hex');
}

function unavailable(
  credentialHash: string | null,
  chainIssuerId: string,
  error: string,
): AnchorResult {
  return {
    status: 'UNAVAILABLE',
    credentialHash,
    chainIssuerId,
    chainTxId: null,
    txHash: null,
    merkleRoot: null,
    blockHeight: null,
    blockHash: null,
    issuerSignatureValid: null,
    proofVerified: null,
    error,
  };
}

/**
 * Poll the chain's public evidence endpoint until the anchor is committed into a
 * block and the inclusion proof verifies.
 *
 * The chain produces a block on its own interval, so this normally resolves on
 * the first or second poll. Bounded by `blockchainAnchorTimeoutMs`; on expiry the
 * caller gets PENDING, which the public DTO reports as "submitted, not yet
 * confirmed" rather than as verified.
 */
async function awaitAnchor(
  credentialId: string,
  credentialHash: string | null,
  chainIssuerId: string,
  txId: string | null,
): Promise<AnchorResult> {
  const deadline = Date.now() + serverConfig.blockchainAnchorTimeoutMs;
  let lastError: string | null = null;

  while (Date.now() < deadline) {
    const evidence = await blockchainClient.credentialEvidence(credentialId);
    if (!evidence.ok) {
      lastError = evidence.error.message;
    } else {
      const result = fromEvidence(evidence.data, credentialHash, chainIssuerId, txId);
      // Only a committed, proof-verified anchor counts as ANCHORED.
      if (result.status === 'ANCHORED') return result;
      if (result.error) lastError = result.error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return {
    status: 'PENDING',
    credentialHash,
    chainIssuerId,
    chainTxId: txId,
    txHash: null,
    merkleRoot: null,
    blockHeight: null,
    blockHash: null,
    issuerSignatureValid: null,
    proofVerified: null,
    error: lastError
      ? `Anchor submitted but not yet confirmed: ${lastError}`
      : 'Anchor submitted but not yet confirmed by the blockchain.',
  };
}

function fromEvidence(
  evidence: ApiCredentialEvidence,
  credentialHash: string | null,
  chainIssuerId: string,
  fallbackTxId: string | null,
): AnchorResult {
  const verification = evidence.verification;
  if (!verification) {
    return unavailable(credentialHash, chainIssuerId, 'The chain returned no verification result.');
  }

  const proof = verification.proof;
  const anchored =
    proof !== null &&
    proof !== undefined &&
    typeof proof.blockHeight === 'number' &&
    proof.blockHeight > 0 &&
    proof.verified === true &&
    isMerkleRoot(proof.merkleRoot);

  if (!anchored) {
    return {
      status: 'PENDING',
      credentialHash,
      chainIssuerId,
      chainTxId: proof?.transactionId ?? fallbackTxId,
      txHash: proof?.transactionHash ?? null,
      merkleRoot: null,
      blockHeight: proof?.blockHeight ?? null,
      blockHash: proof?.blockHash ?? null,
      issuerSignatureValid: verification.issuerSignatureValid === true,
      proofVerified: false,
      error: 'The chain has not yet produced a verified inclusion proof for this anchor.',
    };
  }

  return {
    status: 'ANCHORED',
    credentialHash,
    chainIssuerId,
    chainTxId: proof.transactionId ?? fallbackTxId,
    txHash: proof.transactionHash,
    merkleRoot: proof.merkleRoot,
    blockHeight: proof.blockHeight,
    blockHash: proof.blockHash,
    issuerSignatureValid: verification.issuerSignatureValid === true,
    proofVerified: proof.verified === true,
    error: null,
  };
}

/**
 * Anchor a freshly issued credential.
 *
 * Never throws: an unreachable or rejecting chain becomes an explicit
 * UNAVAILABLE/PENDING result. The credential still exists on the platform — the
 * caller decides how to surface that — but nothing about the anchor is invented.
 */
export async function anchorCredential(
  document: AnchorableCredential,
  credentialHash: string,
): Promise<AnchorResult> {
  const chainIssuerId = serverConfig.blockchainIssuerId;

  const submission = await blockchainClient.createCredential({
    credentialId: document.credentialId,
    issuerId: chainIssuerId,
    credentialHash,
    metadata: { type: document.type },
  });

  if (!submission.ok) {
    return unavailable(credentialHash, chainIssuerId, submission.error.message);
  }

  const receipt: ApiTransactionSubmission = submission.data;
  if (receipt.submitted !== true) {
    return unavailable(credentialHash, chainIssuerId, 'The blockchain service did not accept the anchor.');
  }

  // A non-issuer-signed issuance can never verify against the issuer's public
  // key, so record it explicitly instead of pretending the anchor is good.
  if (receipt.issuerSigned !== true) {
    logger.error('blockchain.anchor_not_issuer_signed', {
      credentialId: document.credentialId,
      hint: 'The chain signed with the node validator key; the credential will not verify against the issuer key.',
    });
  }

  return awaitAnchor(document.credentialId, credentialHash, chainIssuerId, receipt.id ?? null);
}

/**
 * Anchor a revocation.
 *
 * The local status change is authoritative for the platform; this records the
 * matching on-chain lifecycle event. A failure here is reported rather than
 * hidden, because a credential revoked locally but still ACTIVE on-chain is a
 * real, material divergence that a verifier would otherwise not see.
 */
export async function anchorRevocation(credentialId: string): Promise<AnchorResult> {
  const chainIssuerId = serverConfig.blockchainIssuerId;
  // A revocation carries no document of its own, so it does not own the
  // credential hash either — that stays the issuance's value on the row.
  const submission = await blockchainClient.revokeCredential(
    credentialId,
    'Revoked by the issuing institution via the SecureX Platform API.',
  );

  if (!submission.ok) {
    return unavailable(null, chainIssuerId, submission.error.message);
  }
  if (submission.data.submitted !== true) {
    return unavailable(null, chainIssuerId, 'The blockchain service did not accept the revocation.');
  }

  return awaitAnchor(credentialId, null, chainIssuerId, submission.data.id ?? null);
}

/**
 * What a chain lookup can produce.
 *
 * These three outcomes are genuinely different and must stay distinguishable:
 * a chain that holds a record, a chain that was successfully asked and holds
 * nothing, and a chain that could not be asked at all. Collapsing the middle
 * case into the first would claim a submission that never happened.
 */
export type ChainEvidenceRead =
  | ApiCredentialEvidence
  | { notOnChain: true }
  | { unavailable: true; reason: string };

/**
 * Read the chain's current view of a credential for the public verification DTO.
 *
 * Returns an explicit signal when the chain could not be reached — the caller
 * must then report the anchor as unavailable, never as valid.
 */
export async function readChainEvidence(credentialId: string): Promise<ChainEvidenceRead> {
  const evidence = await blockchainClient.credentialEvidence(credentialId);
  if (!evidence.ok) {
    // A 404 is an ANSWER, not a failure: the chain was asked and holds no
    // anchor for this credential. That is not the same as the chain being
    // unreachable, and reporting it as a connectivity failure would be wrong.
    if (evidence.error.code === 'HTTP_ERROR' && evidence.error.status === 404) {
      return { notOnChain: true };
    }
    return { unavailable: true, reason: evidence.error.message };
  }
  return evidence.data;
}