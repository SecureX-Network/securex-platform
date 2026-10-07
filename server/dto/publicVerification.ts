import {
  effectiveCredentialStatus,
  normalizeCredentialStatus,
  type CredentialStatus,
} from '../services/credentialStatus.js';
import { isMerkleRoot } from '../utils/merkle.js';
import type { CredentialRow } from '../db/mappers.js';

// ---------------------------------------------------------------------------
// PUBLIC VERIFICATION DTO
//
// The public credential verification endpoint is unauthenticated, so its
// response is deliberately minimal and is built here — a dedicated DTO — rather
// than by reusing the rich authenticated credential mapper. The authenticated
// institution/admin views keep using mapCredentialRow and are NOT weakened by
// anything in this file.
//
// Publicly exposed: the public SecureX credential ID, the effective status, the
// issuing organisation's display name, and the issue/expiry/revocation/verification
// timestamps.
//
// NEVER exposed publicly (by construction — this type has no field for them):
//   * the internal database credential id (`credentials.id`)
//   * holder id, holder name, holder email
//   * credential metadata / description / type
//   * digital signature, Merkle root, stored tx hash
//   * internal institution id, internal issuer id
//   * revocation reason or other internal revocation detail
//   * fraud-engine internals
//
// TRUTHFULNESS CONTRACT
// No capability is reported as performed unless it genuinely was:
//   * `blockchainProof` is VERIFIED only when the chain returned a committed
//     inclusion proof for this exact credential id: a block height above zero, a
//     64-char Merkle root, and the chain's own `verified` flag. Those values are
//     then reported verbatim. When the anchor is PENDING (submitted, not yet
//     confirmed) or UNAVAILABLE (the chain could not be reached) the check says
//     so in those words and reports no hash, height or root.
//   * `signature` is VERIFIED only when the chain reports
//     `issuerSignatureValid` for this credential — i.e. the issuance signature
//     was checked against the issuer's registered on-chain public key. The
//     signature itself is never exposed.
//   * `documentIntegrity` (only when the caller supplies a `hash`) compares
//     against `credentials.credential_hash`, the SHA-256 of the canonical
//     credential document that was anchored on-chain. It is explicitly scoped:
//     the caller is told it is a platform-document comparison.
// ---------------------------------------------------------------------------

export type PublicVerificationStatus = CredentialStatus;

export type CapabilityStatus = 'VERIFIED' | 'UNVERIFIED' | 'NOT_FOUND';

/**
 * Real ledger evidence, present only when the chain actually returned it.
 * Every field is chain-derived; nothing is synthesised by this service.
 */
export interface PublicBlockchainEvidence {
  /** The chain transaction id for the anchor. */
  transactionId: string;
  transactionHash: string;
  /** Merkle root of the block containing the anchor. */
  merkleRoot: string;
  blockHeight: number;
  blockHash: string;
  /** Whether the chain verified the Merkle inclusion path. */
  inclusionProofVerified: boolean;
}

export interface PublicCapabilityCheck {
  /** True only if the check actually ran and passed. Never true by default. */
  verified: boolean;
  /** True only if a genuine implementation of this check exists. */
  available: boolean;
  status: CapabilityStatus;
  /** Plain-language statement of exactly what was (and was not) checked. */
  detail: string;
  /** Real chain evidence. Present only when the chain returned it. */
  evidence?: PublicBlockchainEvidence;
}

export type DocumentIntegrityStatus = 'EXACT' | 'TAMPERED' | 'UNVERIFIABLE';

export interface PublicDocumentIntegrityCheck {
  credentialId: string;
  /** Echo of the hash the caller supplied (never a stored value). */
  suppliedHash: string;
  /** Whether the supplied hash equals the reference stored on the platform record. */
  hashMatch: boolean;
  status: DocumentIntegrityStatus;
  /**
   * Always 'PLATFORM_RECORD': the comparison is against the hash reference on
   * the SecureX Platform database record, not against a ledger anchor.
   */
  scope: 'PLATFORM_RECORD';
  detail: string;
  verifiedAt: string;
}

export interface PublicVerificationDto {
  /** The public SecureX credential ID (SX-XXXX-XXXX-XXXX) or the requested value. */
  credentialId: string;
  /** Effective status at verification time (EXPIRED derived from expires_at). */
  status: PublicVerificationStatus;
  /** The status literally recorded in the database, for transparency. */
  storedStatus: PublicVerificationStatus;
  /** Display name of the issuing organisation. No internal ids. */
  issuerName: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  /** Present only when the credential is revoked. Reason is never exposed. */
  revokedAt: string | null;
  verifiedAt: string;
  checks: {
    credentialRecord: PublicCapabilityCheck;
    blockchainProof: PublicCapabilityCheck;
    signature: PublicCapabilityCheck;
    documentIntegrity?: PublicDocumentIntegrityCheck;
  };
  /** One concise, truthful sentence describing the outcome. */
  message: string;
}

/** The explicit "we have not implemented this" state, used for chain proofs. */
export function unavailableCheck(detail: string): PublicCapabilityCheck {
  return { verified: false, available: false, status: 'UNVERIFIED', detail };
}

const NOT_FOUND_CHECK: PublicCapabilityCheck = {
  verified: false,
  available: true,
  status: 'NOT_FOUND',
  detail: 'No credential record with this ID exists in the SecureX Platform.',
};

function messageForStatus(status: PublicVerificationStatus): string {
  switch (status) {
    case 'VALID':
      return 'Credential record verified. The SecureX Platform holds a credential record for this ID whose authoritative status is VALID.';
    case 'EXPIRED':
      return 'Credential record found, but it is past its expiration date and is no longer VALID.';
    case 'REVOKED':
      return 'Credential record found. It has been revoked and is no longer VALID.';
    case 'SUSPENDED':
      return 'Credential record found. It is currently suspended by the issuer.';
    case 'TAMPERED':
      return 'Credential record found and flagged as tampered by the issuer.';
    case 'SUSPICIOUS':
      return 'Credential record found and flagged as suspicious by the issuer.';
    case 'INVALID':
      return 'Credential record found, but the issuer has marked it as invalid.';
    default:
      return 'Credential record could not be verified.';
  }
}

/** Result for an ID that matches no credential record. */
export function toPublicNotFoundDto(
  requestedId: string,
  verifiedAt: string,
): PublicVerificationDto {
  return {
    credentialId: requestedId,
    status: 'NOT_FOUND',
    storedStatus: 'NOT_FOUND',
    issuerName: null,
    issuedAt: null,
    expiresAt: null,
    revokedAt: null,
    verifiedAt,
    checks: {
      credentialRecord: NOT_FOUND_CHECK,
      blockchainProof: unavailableCheck(
        'No blockchain record was requested or returned, so no ledger proof is claimed.',
      ),
      signature: unavailableCheck(
        'No signature verification was performed, so no signature or algorithm is claimed.',
      ),
    },
    message: 'No credential record with this ID exists in the SecureX Platform.',
  };
}

export interface BuildPublicVerificationInput {
  row: CredentialRow;
  /** Optional document hash supplied by the caller (64 hex chars). */
  documentHash?: string;
  verifiedAt: string;
  /** Live chain evidence, or the reason it is unavailable. */
  chain?: ChainEvidence;
}

/**
 * What the chain said about this credential.
 *
 * `evidence` is present only when the chain returned a committed inclusion
 * proof. `reason` explains an unavailability rather than hiding it.
 *
 * `onChainRecord: false` is a fourth situation that must not be folded into the
 * others: the chain answered, and it holds no anchor for this credential. That
 * is different from "submitted but not yet confirmed" and from "could not be
 * reached", and reporting it as either would be a false claim.
 */
export type ChainEvidence =
  | {
      available: true;
      /** Whether the chain holds any record for this credential. */
      onChainRecord: boolean;
      proofVerified: boolean;
      issuerSignatureValid: boolean;
      transactionId: string | null;
      transactionHash: string | null;
      merkleRoot: string | null;
      blockHeight: number | null;
      blockHash: string | null;
      chainStatus: string | null;
    }
  | { available: false; reason: string };

function blockchainProofCheck(chain: ChainEvidence | undefined): PublicCapabilityCheck {
  if (!chain) {
    return unavailableCheck(
      'No blockchain record was returned for this credential, so no ledger proof is claimed.',
    );
  }
  if (!chain.available) {
    return {
      verified: false,
      // The chain integration exists; it could not be reached for this lookup.
      available: true,
      status: 'UNVERIFIED',
      detail: `The blockchain service could not be consulted (${chain.reason}), so no ledger proof is claimed. The platform credential record exists independently of the chain.`,
    };
  }
  if (!chain.onChainRecord) {
    return {
      verified: false,
      available: true,
      status: 'UNVERIFIED',
      detail:
        'The SecureX Blockchain was queried and holds no anchor for this credential, so no ledger proof is claimed. The platform credential record exists independently of the chain.',
    };
  }
  const anchored =
    chain.proofVerified &&
    typeof chain.blockHeight === 'number' &&
    chain.blockHeight > 0 &&
    isMerkleRoot(chain.merkleRoot);

  if (!anchored || !chain.transactionId || !chain.transactionHash || !chain.blockHash) {
    return {
      verified: false,
      available: true,
      status: 'UNVERIFIED',
      detail:
        'This credential was submitted to the blockchain but no committed block inclusion proof has been confirmed for it yet, so no transaction hash, block height or Merkle root is presented.',
    };
  }

  return {
    verified: true,
    available: true,
    status: 'VERIFIED',
    detail: `The SecureX Blockchain returned a verified Merkle inclusion proof for this credential in block ${chain.blockHeight}. The transaction and Merkle root below are the chain's own values.`,
    evidence: {
      transactionId: chain.transactionId,
      transactionHash: chain.transactionHash,
      merkleRoot: chain.merkleRoot as string,
      blockHeight: chain.blockHeight as number,
      blockHash: chain.blockHash,
      inclusionProofVerified: chain.proofVerified,
    },
  };
}

function signatureCheck(chain: ChainEvidence | undefined): PublicCapabilityCheck {
  if (!chain) {
    return unavailableCheck(
      'No signature verification was performed, so no signature or algorithm is claimed.',
    );
  }
  if (!chain.available) {
    return {
      verified: false,
      available: true,
      status: 'UNVERIFIED',
      detail: `The blockchain service could not be consulted (${chain.reason}), so the issuer signature was not verified.`,
    };
  }
  if (!chain.onChainRecord) {
    return {
      verified: false,
      available: true,
      status: 'UNVERIFIED',
      detail:
        'The SecureX Blockchain holds no anchor for this credential, so no issuance signature was ever checked against an issuer key.',
    };
  }
  if (chain.issuerSignatureValid !== true) {
    return {
      verified: false,
      available: true,
      status: 'UNVERIFIED',
      detail:
        'The blockchain did not confirm the issuing issuer signature for this credential, so no signature is reported as valid.',
    };
  }
  return {
    verified: true,
    available: true,
    status: 'VERIFIED',
    detail: "The SecureX Blockchain verified this credential's Ed25519 issuance signature against the issuer's registered on-chain public key. The signature and the public key are not disclosed here.",
  };
}

/**
 * Build the public verification DTO for a found credential.
 *
 * `documentHash`, when supplied, is compared against the canonical document hash
 * that was anchored on-chain (`credentials.credential_hash`). Neither the stored
 * hash nor the stored Merkle root is itself ever returned.
 */
export function toPublicVerificationDto({
  row,
  documentHash,
  verifiedAt,
  chain,
}: BuildPublicVerificationInput): PublicVerificationDto {
  const status = effectiveCredentialStatus(row);
  const storedStatus = normalizeCredentialStatus(row.status);

  const dto: PublicVerificationDto = {
    credentialId: row.credential_id,
    status,
    storedStatus,
    issuerName: row.institution_name ?? null,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null,
    verifiedAt,
    checks: {
      credentialRecord: {
        verified: true,
        available: true,
        status: 'VERIFIED',
        detail: `A credential record with this ID exists in the SecureX Platform. Its authoritative status is ${status}.`,
      },
      blockchainProof: blockchainProofCheck(chain),
      signature: signatureCheck(chain),
    },
    message: messageForStatus(status),
  };

  if (documentHash) {
    const anchoredHash = row.credential_hash;
    const comparable = anchoredHash != null && anchoredHash.trim() !== '';
    const hashMatch =
      comparable && documentHash.toLowerCase() === String(anchoredHash).toLowerCase();

    dto.checks.documentIntegrity = {
      credentialId: row.credential_id,
      suppliedHash: documentHash,
      hashMatch,
      status: !comparable ? 'UNVERIFIABLE' : hashMatch ? 'EXACT' : 'TAMPERED',
      scope: 'PLATFORM_RECORD',
      detail: !comparable
        ? 'This credential record stores no anchored document hash, so integrity cannot be compared.'
        : hashMatch
          ? 'The supplied hash matches the canonical credential-document hash anchored for this SecureX Platform record. This is a document comparison, not a signature proof.'
          : 'The supplied hash does not match the canonical credential-document hash anchored for this SecureX Platform record. The document may differ from the recorded version.',
      verifiedAt,
    };

    if (!hashMatch) {
      dto.message = comparable
        ? 'The supplied document hash does not match the anchored hash for this credential record.'
        : 'This credential record stores no anchored document hash, so document integrity could not be compared.';
    }
  }

  return dto;
}
