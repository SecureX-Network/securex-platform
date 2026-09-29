import {
  effectiveCredentialStatus,
  normalizeCredentialStatus,
  type CredentialStatus,
} from '../services/credentialStatus.js';
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
//   * `blockchainProof` is always { verified: false, available: false,
//     status: 'UNVERIFIED' }. SecureX does not submit this credential's anchor
//     to a blockchain node and has not received a block inclusion proof, so no
//     transaction hash, block height, or confirmation count can be asserted.
//   * `signature` is always { verified: false, available: false,
//     status: 'UNVERIFIED' }. No Ed25519 (or any other) signature verification
//     is implemented, so no algorithm name and no `valid: true` is asserted.
//   * `documentIntegrity` (only when the caller supplies a `hash`) reports a real,
//     performed comparison against the hash reference stored on the platform
//     record. It is explicitly scoped to the platform record: it is NOT a
//     blockchain anchor check and NOT a signature check.
// ---------------------------------------------------------------------------

export type PublicVerificationStatus = CredentialStatus;

export type CapabilityStatus = 'VERIFIED' | 'UNVERIFIED' | 'NOT_FOUND';

export interface PublicCapabilityCheck {
  /** True only if the check actually ran and passed. Never true by default. */
  verified: boolean;
  /** True only if a genuine implementation of this check exists. */
  available: boolean;
  status: CapabilityStatus;
  /** Plain-language statement of exactly what was (and was not) checked. */
  detail: string;
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
}

/**
 * Build the public verification DTO for a found credential.
 *
 * `documentHash`, when supplied, is compared against the hash reference stored
 * on the platform record. The stored reference itself is NEVER returned.
 */
export function toPublicVerificationDto({
  row,
  documentHash,
  verifiedAt,
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
      blockchainProof: unavailableCheck(
        'Blockchain anchoring is not verified. SecureX has not obtained a block inclusion proof for this credential, so no transaction hash, block height, or confirmation count is presented.',
      ),
      signature: unavailableCheck(
        'Cryptographic signature verification is not implemented. No signature algorithm is claimed and no signature is reported as valid.',
      ),
    },
    message: messageForStatus(status),
  };

  if (documentHash) {
    const anchoredHash = row.merkle_root;
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
        ? 'This credential record stores no document hash reference, so integrity cannot be compared.'
        : hashMatch
          ? 'The supplied hash matches the document hash reference stored on this SecureX Platform record. This is a platform-record comparison, not a blockchain or signature proof.'
          : 'The supplied hash does not match the document hash reference stored on this SecureX Platform record. The document may differ from the recorded version.',
      verifiedAt,
    };

    if (!hashMatch) {
      dto.message = comparable
        ? 'The supplied document hash does not match the hash reference stored on this credential record.'
        : 'This credential record stores no document hash reference, so document integrity could not be compared.';
    }
  }

  return dto;
}
