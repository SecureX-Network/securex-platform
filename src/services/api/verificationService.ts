import { IS_MOCK } from '@/constants';
import { MOCK_CREDENTIALS, MOCK_VERIFICATION_HISTORY, mockDelay } from '@/services/mock';
import type { CredentialStatus, VerificationHistory } from '@/types';
import { fetchAPI, unwrapResponse } from './client';

// ---------------------------------------------------------------------------
// PUBLIC VERIFICATION DTO (browser side of server/dto/publicVerification.ts)
//
// The verification endpoint is unauthenticated, so it serves a purpose-built
// minimal DTO. These declarations must stay field-for-field in step with the
// server's `PublicVerificationDto`: nothing is inferred, and every capability
// the server marks unavailable is represented here as `available: false` rather
// than being omitted, so the UI can state plainly what was NOT checked.
// ---------------------------------------------------------------------------

export type PublicVerificationStatus = CredentialStatus;

export type PublicCapabilityStatus = 'VERIFIED' | 'UNVERIFIED' | 'NOT_FOUND';

export interface PublicCapabilityCheck {
  verified: boolean;
  available: boolean;
  status: PublicCapabilityStatus;
  detail: string;
}

export type PublicDocumentIntegrityStatus = 'EXACT' | 'TAMPERED' | 'UNVERIFIABLE';

export interface PublicDocumentIntegrityCheck {
  credentialId: string;
  suppliedHash: string;
  hashMatch: boolean;
  status: PublicDocumentIntegrityStatus;
  scope: 'PLATFORM_RECORD';
  detail: string;
  verifiedAt: string;
}

export interface PublicVerificationResult {
  credentialId: string;
  status: PublicVerificationStatus;
  storedStatus: PublicVerificationStatus;
  issuerName: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  verifiedAt: string;
  checks: {
    credentialRecord: PublicCapabilityCheck;
    blockchainProof: PublicCapabilityCheck;
    signature: PublicCapabilityCheck;
    documentIntegrity?: PublicDocumentIntegrityCheck;
  };
  message: string;
}

// ---------------------------------------------------------------------------
// DEMO BUILDERS
//
// DEMO mode is an explicitly opt-in, fully offline preview (VITE_USE_MOCK=true).
// It is NOT the real verification path, but it speaks the SAME DTO as the real
// Platform API so the UI is exercised honestly: in particular it never claims a
// blockchain proof or a signature verification, because SecureX does not
// implement either.
// ---------------------------------------------------------------------------

const DEMO_UNAVAILABLE_BLOCKCHAIN_PROOF: PublicCapabilityCheck = {
  verified: false,
  available: false,
  status: 'UNVERIFIED',
  detail:
    'Blockchain anchoring is not verified. SecureX has not obtained a block inclusion proof for this credential, so no transaction hash, block height, or confirmation count is presented.',
};

const DEMO_UNAVAILABLE_SIGNATURE: PublicCapabilityCheck = {
  verified: false,
  available: false,
  status: 'UNVERIFIED',
  detail:
    'Cryptographic signature verification is not implemented. No signature algorithm is claimed and no signature is reported as valid.',
};

function mockMessageForStatus(status: PublicVerificationStatus): string {
  switch (status) {
    case 'VALID':
      return 'Credential record verified (DEMO data).';
    case 'EXPIRED':
      return 'Credential record found (DEMO data), but it is past its expiration date and is no longer VALID.';
    case 'REVOKED':
      return 'Credential record found (DEMO data). It has been revoked and is no longer VALID.';
    case 'SUSPENDED':
      return 'Credential record found (DEMO data). It is currently suspended by the issuer.';
    default:
      return 'Credential record could not be verified (DEMO data).';
  }
}

function buildMockVerification(
  credentialId: string,
  documentHash?: string,
): PublicVerificationResult {
  const verifiedAt = new Date().toISOString();
  const credential = MOCK_CREDENTIALS.find(
    (c) => c.credentialId === credentialId || c.id === credentialId,
  );

  if (!credential) {
    return {
      credentialId,
      status: 'NOT_FOUND',
      storedStatus: 'NOT_FOUND',
      issuerName: null,
      issuedAt: null,
      expiresAt: null,
      revokedAt: null,
      verifiedAt,
      checks: {
        credentialRecord: {
          verified: false,
          available: true,
          status: 'NOT_FOUND',
          detail: 'No DEMO credential record with this ID exists.',
        },
        blockchainProof: DEMO_UNAVAILABLE_BLOCKCHAIN_PROOF,
        signature: DEMO_UNAVAILABLE_SIGNATURE,
      },
      message: 'No credential record with this ID exists in the DEMO dataset.',
    };
  }

  const checks: PublicVerificationResult['checks'] = {
    credentialRecord: {
      verified: true,
      available: true,
      status: 'VERIFIED',
      detail: `A DEMO credential record with this ID exists. Its status is ${credential.status}.`,
    },
    blockchainProof: DEMO_UNAVAILABLE_BLOCKCHAIN_PROOF,
    signature: DEMO_UNAVAILABLE_SIGNATURE,
  };

  let message = mockMessageForStatus(credential.status);

  if (documentHash) {
    const reference = credential.merkleRoot;
    const comparable = reference != null && reference.trim() !== '';
    const hashMatch =
      comparable && documentHash.toLowerCase() === String(reference).toLowerCase();
    checks.documentIntegrity = {
      credentialId: credential.credentialId,
      suppliedHash: documentHash,
      hashMatch,
      status: !comparable ? 'UNVERIFIABLE' : hashMatch ? 'EXACT' : 'TAMPERED',
      scope: 'PLATFORM_RECORD',
      detail: !comparable
        ? 'This DEMO credential record stores no document hash reference, so integrity cannot be compared.'
        : hashMatch
          ? 'The supplied hash matches the reference stored on this DEMO record. This is a record comparison, not a blockchain or signature proof.'
          : 'The supplied hash does not match the reference stored on this DEMO record. The document may differ from the recorded version.',
      verifiedAt,
    };
    if (!hashMatch) {
      message = comparable
        ? 'The supplied document hash does not match the reference stored on this DEMO record.'
        : 'This DEMO record stores no document hash reference, so document integrity could not be compared.';
    }
  }

  return {
    credentialId: credential.credentialId,
    status: credential.status,
    storedStatus: credential.status,
    issuerName: credential.institutionName,
    issuedAt: credential.issuedAt,
    expiresAt: credential.expiresAt ?? null,
    revokedAt: credential.revokedAt ?? null,
    verifiedAt,
    checks,
    message,
  };
}

export async function verifyCredential(
  credentialId: string,
  documentHash?: string,
): Promise<PublicVerificationResult> {
  if (IS_MOCK) {
    await mockDelay();
    return buildMockVerification(credentialId, documentHash);
  }
  const hashQuery = documentHash ? `&hash=${encodeURIComponent(documentHash)}` : '';
  const response = await fetchAPI<PublicVerificationResult>(
    `/verifications?credentialId=${encodeURIComponent(credentialId)}${hashQuery}`,
  );
  return unwrapResponse(response);
}

export async function getVerificationHistory(
  employerId: string,
): Promise<VerificationHistory[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_VERIFICATION_HISTORY.filter(
      (item) => item.verifiedBy !== undefined || employerId,
    );
  }
  const response = await fetchAPI<VerificationHistory[]>(
    `/verifications/history?employerId=${encodeURIComponent(employerId)}`,
  );
  return unwrapResponse(response);
}

export async function searchCredential(
  credentialId: string,
): Promise<PublicVerificationResult> {
  if (IS_MOCK) {
    await mockDelay();
    return buildMockVerification(credentialId);
  }
  const response = await fetchAPI<PublicVerificationResult>(
    `/verifications/search?credentialId=${encodeURIComponent(credentialId)}`,
  );
  return unwrapResponse(response);
}