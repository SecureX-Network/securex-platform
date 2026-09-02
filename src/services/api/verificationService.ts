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
): Promise<VerificationResult> {
  if (IS_MOCK) {
    await mockDelay();
    return buildMockVerification(credentialId);
  }
  const response = await fetchAPI<VerificationResult>(
    `/verifications?credentialId=${encodeURIComponent(credentialId)}`,
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