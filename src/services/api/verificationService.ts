import { IS_MOCK } from '@/constants';
import {
  MOCK_BLOCKS,
  MOCK_CREDENTIALS,
  MOCK_INSTITUTIONS,
  MOCK_ISSUERS,
  MOCK_VERIFICATION_HISTORY,
  mockDelay,
} from '@/services/mock';
import type { CredentialStatus, VerificationHistory, VerificationResult } from '@/types';
import { fetchAPI, unwrapResponse } from './client';

export interface PlatformDocumentHashCheck {
  credentialId: string;
  suppliedHash: string;
  anchoredHash: string | null;
  hashMatch: boolean;
  status: 'EXACT' | 'TAMPERED' | 'UNVERIFIABLE';
  verifiedAt: string;
}

export type PlatformVerificationResult = VerificationResult & {
  documentHashCheck?: PlatformDocumentHashCheck;
  message?: string;
};

function applyMockDocumentHashCheck(
  result: VerificationResult,
  suppliedHash: string,
): PlatformVerificationResult {
  const credential = result.credential;
  if (!credential) return result;
  const anchoredHash = credential.merkleRoot ?? null;
  const hashMatch =
    anchoredHash != null && suppliedHash.toLowerCase() === anchoredHash.toLowerCase();
  const documentHashCheck: PlatformDocumentHashCheck = {
    credentialId: result.credentialId,
    suppliedHash,
    anchoredHash,
    hashMatch,
    status: hashMatch ? 'EXACT' : 'TAMPERED',
    verifiedAt: new Date().toISOString(),
  };
  if (!hashMatch) {
    return {
      ...result,
      documentHashCheck,
      signatureVerification: { ...result.signatureVerification, valid: false },
      fraudCheck: {
        ...result.fraudCheck,
        flags: [...result.fraudCheck.flags, 'Hash verification failed — document does not match the ledger record'],
      },
    };
  }
  return { ...result, documentHashCheck };
}

interface RiskProfile {
  riskLevel: VerificationResult['fraudCheck']['riskLevel'];
  score: number;
  flags: string[];
}

function riskForStatus(status: CredentialStatus): RiskProfile {
  switch (status) {
    case 'VALID':
      return { riskLevel: 'LOW', score: 9, flags: ['No anomalies detected'] };
    case 'REVOKED':
      return {
        riskLevel: 'HIGH',
        score: 74,
        flags: ['Credential has been revoked by the issuer'],
      };
    case 'SUSPENDED':
      return {
        riskLevel: 'MEDIUM',
        score: 55,
        flags: ['Credential temporarily suspended pending review'],
      };
    case 'EXPIRED':
      return {
        riskLevel: 'MEDIUM',
        score: 41,
        flags: ['Credential has exceeded its validity period'],
      };
    case 'TAMPERED':
      return {
        riskLevel: 'CRITICAL',
        score: 96,
        flags: ['Digital signature mismatch detected', 'Hash verification failed'],
      };
    case 'SUSPICIOUS':
      return {
        riskLevel: 'HIGH',
        score: 82,
        flags: ['Anomalous issuance pattern detected'],
      };
    default:
      return {
        riskLevel: 'HIGH',
        score: 90,
        flags: ['Could not verify credential integrity'],
      };
  }
}

function buildMockVerification(credentialId: string): VerificationResult {
  const credential = MOCK_CREDENTIALS.find(
    (c) => c.credentialId === credentialId || c.id === credentialId,
  );

  if (!credential) {
    return {
      credentialId,
      status: 'NOT_FOUND',
      issuer: { name: 'Unknown', verified: false },
      blockchainProof: { verified: false },
      signatureVerification: { valid: false },
      fraudCheck: {
        riskLevel: 'HIGH',
        score: 92,
        flags: ['Credential ID not found on distributed ledger'],
      },
      verifiedAt: new Date().toISOString(),
    };
  }

  const issuer = MOCK_ISSUERS.find((i) => i.id === credential.issuerId);
  const institution = MOCK_INSTITUTIONS.find(
    (i) => i.id === credential.institutionId,
  );
  const block =
    MOCK_BLOCKS[credential.credentialId.length % MOCK_BLOCKS.length] ??
    MOCK_BLOCKS[0];
  const isValid = credential.status === 'VALID';
  const risk = riskForStatus(credential.status);

  return {
    credentialId: credential.credentialId,
    status: credential.status,
    credential,
    issuer: {
      name: credential.institutionName,
      verified: institution?.verified ?? false,
      publicKey: issuer?.publicKey,
    },
    blockchainProof: {
      verified: isValid,
      txHash: credential.blockchainTxHash,
      blockHeight: block?.height,
      confirmations: isValid ? 26 : 0,
      timestamp: block?.timestamp,
    },
    signatureVerification: {
      valid:
        credential.status !== 'TAMPERED' && credential.status !== 'NOT_FOUND',
      algorithm: 'Ed25519-SHA256',
      verifiedAt: new Date().toISOString(),
    },
    fraudCheck: risk,
    verifiedAt: new Date().toISOString(),
  };
}

export async function verifyCredential(
  credentialId: string,
  documentHash?: string,
): Promise<PlatformVerificationResult> {
  if (IS_MOCK) {
    await mockDelay();
    const result = buildMockVerification(credentialId);
    if (documentHash) {
      return applyMockDocumentHashCheck(result, documentHash);
    }
    return result;
  }
  const hashQuery = documentHash ? `&hash=${encodeURIComponent(documentHash)}` : '';
  const response = await fetchAPI<PlatformVerificationResult>(
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
): Promise<VerificationResult> {
  if (IS_MOCK) {
    await mockDelay();
    return buildMockVerification(credentialId);
  }
  const response = await fetchAPI<VerificationResult>(
    `/verifications/search?credentialId=${encodeURIComponent(credentialId)}`,
  );
  return unwrapResponse(response);
}