import { IS_MOCK } from '@/constants';
import { MOCK_BLOCKS, MOCK_CREDENTIALS, MOCK_INSTITUTIONS, MOCK_TRANSACTIONS, mockDelay } from '@/services/mock';
import type { BlockchainBlock, BlockchainTransaction, PaginatedResponse } from '@/types';
import { fetchAPI, unwrapResponse } from './client';

export interface NetworkStats {
  chainId: string;
  networkName: string;
  totalBlocks: number;
  totalTransactions: number;
  totalCredentials: number;
  totalInstitutions: number;
  nodesOnline: number;
  totalNodes: number;
  avgBlockTime: number;
  tps: number;
  networkStatus: 'HEALTHY' | 'DEGRADED' | 'SYNCING';
  lastBlockHeight: number;
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getBlocks(page = 1): Promise<PaginatedResponse<BlockchainBlock>> {
  if (IS_MOCK) {
    await mockDelay();
    return paginate(MOCK_BLOCKS, page, 10);
  }
  const response = await fetchAPI<PaginatedResponse<BlockchainBlock>>(
    `/blocks?page=${page}&pageSize=10`,
  );
  return unwrapResponse(response);
}

export async function getBlockByHeight(height: number): Promise<BlockchainBlock> {
  if (IS_MOCK) {
    await mockDelay();
    const block = MOCK_BLOCKS.find((b) => b.height === height);
    if (!block) {
      throw new Error(`Block at height ${height} not found.`);
    }
    return block;
  }
  const response = await fetchAPI<BlockchainBlock>(`/blocks/${height}`);
  return unwrapResponse(response);
}

export async function getTransactions(
  page = 1,
): Promise<PaginatedResponse<BlockchainTransaction>> {
  if (IS_MOCK) {
    await mockDelay();
    return paginate(MOCK_TRANSACTIONS, page, 12);
  }
  const response = await fetchAPI<PaginatedResponse<BlockchainTransaction>>(
    `/transactions?page=${page}&pageSize=12`,
  );
  return unwrapResponse(response);
}

export async function getTransactionById(id: string): Promise<BlockchainTransaction> {
  if (IS_MOCK) {
    await mockDelay();
    const transaction = MOCK_TRANSACTIONS.find((tx) => tx.id === id);
    if (!transaction) {
      throw new Error(`Transaction ${id} not found.`);
    }
    return transaction;
  }
  const response = await fetchAPI<BlockchainTransaction>(`/transactions/${id}`);
  return unwrapResponse(response);
}

export async function getNetworkStats(): Promise<NetworkStats> {
  if (IS_MOCK) {
    await mockDelay();
    const lastBlock = MOCK_BLOCKS[MOCK_BLOCKS.length - 1];
    return {
      chainId: 'securex-mainnet-01',
      networkName: 'SecureX Trust Network',
      totalBlocks: MOCK_BLOCKS.length,
      totalTransactions: MOCK_TRANSACTIONS.length,
      totalCredentials: MOCK_CREDENTIALS.length,
      totalInstitutions: MOCK_INSTITUTIONS.length,
      nodesOnline: 42,
      totalNodes: 47,
      avgBlockTime: 4.2,
      tps: 128,
      networkStatus: 'HEALTHY',
      lastBlockHeight: lastBlock?.height ?? 0,
    };
  }
  const response = await fetchAPI<NetworkStats>('/network/stats');
  return unwrapResponse(response);
}