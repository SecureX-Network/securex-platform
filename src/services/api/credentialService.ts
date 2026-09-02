import { IS_MOCK } from '@/constants';
import { MOCK_CREDENTIALS, mockDelay } from '@/services/mock';
import type { Credential } from '@/types';
import { fetchAPI, unwrapResponse } from './client';

export interface IssueCredentialData {
  type: string;
  title: string;
  description: string;
  holderName: string;
  holderId: string;
  issuerId: string;
  issuerName: string;
  institutionId: string;
  institutionName: string;
  templateId?: string;
  expiresAt?: string;
  metadata?: Record<string, string>;
}

function mockCredentialId(): string {
  const part = () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0')
      .toUpperCase();
  return `SX-${part()}-${part()}-${part()}`;
}

function mockHex(length: number): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * 16));
  }
  return out;
}

export async function getCredentials(): Promise<Credential[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_CREDENTIALS;
  }
  const response = await fetchAPI<Credential[]>('/credentials');
  return unwrapResponse(response);
}

export async function getCredentialById(id: string): Promise<Credential> {
  if (IS_MOCK) {
    await mockDelay();
    const credential = MOCK_CREDENTIALS.find(
      (c) => c.id === id || c.credentialId === id,
    );
    if (!credential) {
      throw new Error(`Credential ${id} not found.`);
    }
    return credential;
  }
  const response = await fetchAPI<Credential>(`/credentials/${id}`);
  return unwrapResponse(response);
}

export async function getHolderCredentials(holderId: string): Promise<Credential[]> {
  if (IS_MOCK) {
    await mockDelay();
    return MOCK_CREDENTIALS.filter((c) => c.holderId === holderId);
  }
  const response = await fetchAPI<Credential[]>(
    `/credentials?holderId=${encodeURIComponent(holderId)}`,
  );
  return unwrapResponse(response);
}

export async function issueCredential(data: IssueCredentialData): Promise<Credential> {
  if (IS_MOCK) {
    await mockDelay();
    const credential: Credential = {
      id: `cred-${Date.now()}`,
      credentialId: mockCredentialId(),
      type: data.type,
      title: data.title,
      description: data.description,
      holderName: data.holderName,
      holderId: data.holderId,
      issuerId: data.issuerId,
      issuerName: data.issuerName,
      institutionId: data.institutionId,
      institutionName: data.institutionName,
      status: 'VALID',
      issuedAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      blockchainTxHash: `0x${mockHex(64)}`,
      merkleRoot: mockHex(64),
      digitalSignature: mockHex(64),
      templateId: data.templateId,
      metadata: data.metadata,
    };
    MOCK_CREDENTIALS.push(credential);
    return credential;
  }
  const response = await fetchAPI<Credential>('/credentials', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return unwrapResponse(response);
}

export async function revokeCredential(id: string): Promise<void> {
  if (IS_MOCK) {
    await mockDelay();
    const credential = MOCK_CREDENTIALS.find(
      (c) => c.id === id || c.credentialId === id,
    );
    if (!credential) {
      throw new Error(`Credential ${id} not found.`);
    }
    credential.status = 'REVOKED';
    credential.revokedAt = new Date().toISOString();
    credential.revokedReason = 'Revoked by issuer';
    return;
  }
  await fetchAPI<void>(`/credentials/${id}/revoke`, { method: 'POST' });
}