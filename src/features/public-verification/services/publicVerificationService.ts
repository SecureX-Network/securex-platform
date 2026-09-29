import {
  verifyCredential,
  type PublicVerificationResult,
} from '@/services/api/verificationService';
import type { VerificationView } from '@/features/holder-admin/services/holderAdminService';

/**
 * Public credential verification against the SecureX Platform API
 * (GET /verifications). The platform is the single canonical verification
 * source for the public portal: credentials issued through the institution
 * flow live in the platform and verify here end-to-end. The result is mapped
 * to the VerificationView shape the shared verification UI renders.
 *
 * Optional documentHash runs the platform-record document-integrity check via
 * the platform's `hash` query parameter. It compares the supplied hash against
 * the hash reference stored on the platform record; the stored reference itself
 * is never returned.
 *
 * Nothing here invents capability: the DTO reports `available: false` for every
 * check SecureX does not actually perform, and this mapper passes those reports
 * through untouched.
 */
export async function verifyPublicCredential(
  credentialId: string,
  documentHash?: string,
): Promise<VerificationView> {
  const res = await verifyCredential(credentialId, documentHash);
  return toVerificationView(res);
}

export function toVerificationView(res: PublicVerificationResult): VerificationView {
  return {
    credentialId: res.credentialId,
    status: res.status,
    storedStatus: res.storedStatus,
    issuerName: res.issuerName,
    issuedAt: res.issuedAt,
    expiresAt: res.expiresAt,
    revokedAt: res.revokedAt,
    verifiedAt: res.verifiedAt,
    checks: {
      credentialRecord: res.checks.credentialRecord,
      blockchainProof: res.checks.blockchainProof,
      signature: res.checks.signature,
    },
    documentIntegrity: res.checks.documentIntegrity,
    message: res.message,
  };
}
