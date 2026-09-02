import type { Validator, ValidatorRole, ValidatorStatus } from '../types';

interface ValidatorSeed {
  id: string;
  name: string;
  role: ValidatorRole;
  status: ValidatorStatus;
  identity?: string;
  publicKey: string;
  currentHeight: number;
  blocksProposed: number;
  transactionsProcessed: number;
  joinedAt: string;
  version: string;
}

const LAST_SEEN_ISO = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const RECENT_ISO = new Date(Date.now() - 35 * 60 * 1000).toISOString();

const SEEDS: ValidatorSeed[] = [
  {
    id: 'val-01',
    name: 'SecureX Validator 01',
    role: 'BLOCK_PRODUCER',
    status: 'ONLINE',
    publicKey: '0x5a1f19c8d3e24b6a70d2f9b8a4e16c03d95a8b44e2d6f7a1c09b8d3e5f2a77c1',
    currentHeight: 22,
    blocksProposed: 6,
    transactionsProcessed: 1842,
    joinedAt: '2026-01-12T08:30:00.000Z',
    version: 'v2.1.0',
  },
  {
    id: 'val-02',
    name: 'SecureX Validator 02',
    role: 'VALIDATOR',
    status: 'ONLINE',
    publicKey: '0xc24e8d91b3f7a50e6c1d9a4b8e37d05f9c2a7b1e4d6f8c03a95b2e7f1d40a68d',
    currentHeight: 21,
    blocksProposed: 6,
    transactionsProcessed: 1794,
    joinedAt: '2026-01-15T10:00:00.000Z',
    version: 'v2.1.0',
  },
  {
    id: 'val-03',
    name: 'SecureX Validator 03',
    role: 'VALIDATOR',
    status: 'ONLINE',
    publicKey: '0x8f3d7a2e6c1b9d40a58e2c7f1b4d60a93e8c5b2f7a1d4e60c9b3f8a2e5d177b',
    currentHeight: 22,
    blocksProposed: 5,
    transactionsProcessed: 1701,
    joinedAt: '2026-02-02T14:45:00.000Z',
    version: 'v2.0.9',
  },
  {
    id: 'val-04',
    name: 'SecureX Validator 04',
    role: 'WITNESS',
    status: 'ONLINE',
    publicKey: '0x1b9e4d7f2c60a83b5e1d94f7a2c06b8d3e5f91a4c7b2d60e8f3a5c9d1b47e02',
    currentHeight: 22,
    blocksProposed: 5,
    transactionsProcessed: 1589,
    joinedAt: '2026-02-20T09:15:00.000Z',
    version: 'v2.0.9',
  },
  {
    id: 'val-05',
    name: 'SecureX Validator 05',
    role: 'WITNESS',
    status: 'SYNCING',
    publicKey: '0x7e2a5c90b4d8f13e6a7c05b2f9d8e43a1c67b50d9f2e4a8c3b1d6f70a9e52c84',
    currentHeight: 18,
    blocksProposed: 0,
    transactionsProcessed: 214,
    joinedAt: '2026-03-11T16:20:00.000Z',
    version: 'v2.0.8',
  },
  {
    id: 'val-06',
    name: 'SecureX Validator 06',
    role: 'WITNESS',
    status: 'OFFLINE',
    publicKey: '0x3d6b90f1a5e47c28d9b60e3a7f5c18d4b2e90a6f7c3d5e19b8a4f2c0d7e63b1a',
    currentHeight: 17,
    blocksProposed: 0,
    transactionsProcessed: 96,
    joinedAt: '2026-03-30T11:10:00.000Z',
    version: 'v2.0.7',
  },
];

const toIdentity = (publicKey: string, index: number) =>
  `0x${publicKey.slice(2).split('').reverse().join('')}${String(index).padStart(4, '0')}`;

export const MOCK_VALIDATORS: Validator[] = SEEDS.map((seed, index) => ({
  ...seed,
  identity: seed.identity ?? toIdentity(seed.publicKey, index + 1),
  lastSeen: seed.status === 'ONLINE' ? LAST_SEEN_ISO : seed.status === 'SYNCING' ? RECENT_ISO : seed.joinedAt,
}));

export const ONLINE_VALIDATORS = MOCK_VALIDATORS.filter(
  (v) => v.status === 'ONLINE',
).length;

export const CURRENT_PROPOSER_ID = 'val-01';
