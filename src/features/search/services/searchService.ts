import { MOCK_CREDENTIALS, MOCK_INSTITUTIONS, MOCK_ISSUERS, MOCK_USERS, MOCK_BLOCKS, MOCK_TRANSACTIONS } from '@/services/mock';
import type { Credential, Institution, Issuer, User, BlockchainBlock, BlockchainTransaction } from '@/types';

export interface SearchResult {
  id: string;
  label: string;
  description?: string;
  group: string;
  path: string;
  category: 'credential' | 'user' | 'institution' | 'issuer' | 'block' | 'transaction';
}

export interface GroupedSearchResults {
  group: string;
  items: SearchResult[];
}

function normalize(value: string): string {
  return value.toLowerCase();
}

export function searchEntities(query: string): SearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const credential of MOCK_CREDENTIALS as Credential[]) {
    if (
      credential.credentialId.toLowerCase().includes(q) ||
      credential.title.toLowerCase().includes(q) ||
      credential.holderName.toLowerCase().includes(q)
    ) {
      results.push({
        id: credential.id,
        label: credential.title,
        description: `${credential.credentialId} · ${credential.holderName}`,
        group: 'Credentials',
        path: `/verify/${credential.credentialId}`,
        category: 'credential',
      });
    }
  }

  for (const user of MOCK_USERS as User[]) {
    if (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    ) {
      results.push({
        id: user.id,
        label: user.name,
        description: user.email,
        group: 'Users',
        path: '/admin/users',
        category: 'user',
      });
    }
  }

  for (const institution of MOCK_INSTITUTIONS as Institution[]) {
    if (institution.name.toLowerCase().includes(q)) {
      results.push({
        id: institution.id,
        label: institution.name,
        description: 'Institution',
        group: 'Institutions',
        path: '/admin/institutions',
        category: 'institution',
      });
    }
  }

  for (const issuer of MOCK_ISSUERS as Issuer[]) {
    if (issuer.name.toLowerCase().includes(q)) {
      results.push({
        id: issuer.id,
        label: issuer.name,
        description: issuer.publicKey ?? 'Issuer',
        group: 'Issuers',
        path: `/institution/issuers/${issuer.id}`,
        category: 'issuer',
      });
    }
  }

  for (const block of MOCK_BLOCKS as BlockchainBlock[]) {
    if (String(block.height).includes(q) || block.hash.toLowerCase().includes(q)) {
      results.push({
        id: String(block.height),
        label: `Block #${block.height}`,
        description: block.hash,
        group: 'Blocks',
        path: `/explorer/blocks/${block.height}`,
        category: 'block',
      });
    }
  }

  for (const tx of MOCK_TRANSACTIONS as BlockchainTransaction[]) {
    if (tx.id.toLowerCase().includes(q)) {
      results.push({
        id: tx.id,
        label: tx.id,
        description: tx.type,
        group: 'Transactions',
        path: `/explorer/transactions/${tx.id}`,
        category: 'transaction',
      });
    }
  }

  return results;
}

export function groupSearchResults(results: SearchResult[]): GroupedSearchResults[] {
  const groups = new Map<string, SearchResult[]>();
  for (const result of results) {
    const list = groups.get(result.group) ?? [];
    list.push(result);
    groups.set(result.group, list);
  }
  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
}