import { verifyCredential, type PlatformVerificationResult } from '@/services/api/verificationService';
import type { VerificationView } from '@/features/holder-admin/services/holderAdminService';

/**
 * Public credential verification against the SecureX Platform API
 * (GET /verifications). The platform is the single canonical verification
 * source for the public portal: credentials issued through the institution
 * flow live in the platform and verify here end-to-end. The result is mapped
 * to the VerificationView shape the shared verification UI renders.
 *
 * Optional documentHash runs the ledger document-integrity (tamper) check via
 * the platform's `hash` query parameter.
 */
export async function verifyPublicCredential(
  credentialId: string,
  documentHash?: string,
): Promise<VerificationView> {
  const res = await verifyCredential(credentialId, documentHash);
  return toVerificationView(res);
}

export function toVerificationView(res: PlatformVerificationResult): VerificationView {
  const proof = res.blockchainProof;
  const credential = res.credential;
  const tampered = Boolean(res.documentHashCheck && !res.documentHashCheck.hashMatch);

  return {
    status: res.status as VerificationView['status'],
    credentialId: res.credentialId,
    credentialHash: credential?.merkleRoot,
    issuer: res.issuer
      ? {
          issuerId: credential?.issuerId ?? res.issuer.name,
          name: res.issuer.name,
          publicKey: res.issuer.publicKey ?? '',
          status: res.issuer.verified ? 'ACTIVE' : 'UNKNOWN',
        }
      : undefined,
    transaction: proof?.txHash
      ? { id: proof.txHash, type: 'CREDENTIAL_ISSUED', blockHeight: proof.blockHeight ?? 0, blockHash: '' }
      : undefined,
    block: proof?.timestamp
      ? { height: proof.blockHeight ?? 0, hash: '', timestamp: proof.timestamp, proposer: '' }
      : undefined,
    issuerSignatureValid: res.signatureVerification.valid,
    keyStatus: undefined,
    protocolCompatible: proof?.verified,
    verifiedAt: res.verifiedAt,
    securityChecks: {
      credentialExists: res.status !== 'NOT_FOUND',
      signatureValid: res.signatureVerification.valid,
      blockchainVerified: proof?.verified ?? false,
      fraudRiskLow: res.fraudCheck.riskLevel === 'LOW',
    },
    documentHashCheck: res.documentHashCheck,
    message:
      res.status === 'NOT_FOUND'
        ? 'Credential not found on the SecureX ledger.'
        : tampered
          ? 'The document hash does not match the ledger record. The document may have been tampered with.'
          : undefined,
  };
}