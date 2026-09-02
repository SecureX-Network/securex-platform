import type { NetworkOverview, Peer, ValidatorStatus } from '../types';
import { MOCK_VALIDATORS, ONLINE_VALIDATORS, CURRENT_PROPOSER_ID } from './validators';

const NETWORK_HEIGHT = 22;
const LATEST_BLOCK_HASH =
  '0x1b9e4d7f2c60a83b5e1d94f7a2c06b8d3e5f91a4c7b2d60e8f3a5c9d1b47e02c81d';

const NOW = Date.now();
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const PRIMARY_PEERS: Peer[] = MOCK_VALIDATORS.map((validator, index) => ({
  id: `peer-${String(index + 1).padStart(2, '0')}`,
  name: validator.name,
  status: (validator.status === 'ONLINE'
    ? 'ONLINE'
    : validator.status === 'SYNCING'
      ? 'SYNCING'
      : 'OFFLINE') as ValidatorStatus,
  height: validator.currentHeight,
  latency: [12, 18, 9, 24, 140, 0][index] ?? 0,
  version: validator.version,
  lastSeen: validator.lastSeen,
}));

const EXTRA_PEERS: Peer[] = [
  {
    id: 'peer-07',
    name: 'SecureX Bootnode',
    status: 'ONLINE',
    height: NETWORK_HEIGHT,
    latency: 7,
    version: 'v2.1.0',
    lastSeen: iso(1 * 60 * 1000),
  },
  {
    id: 'peer-08',
    name: 'SecureX Relay 01',
    status: 'ONLINE',
    height: NETWORK_HEIGHT,
    latency: 11,
    version: 'v2.1.0',
    lastSeen: iso(3 * 60 * 1000),
  },
];

const proposer = MOCK_VALIDATORS.find((v) => v.id === CURRENT_PROPOSER_ID);

export const MOCK_NETWORK: NetworkOverview = {
  status: 'HEALTHY',
  currentHeight: NETWORK_HEIGHT,
  latestBlockHash: LATEST_BLOCK_HASH,
  totalNodes: 8,
  onlineNodes: 7,
  totalValidators: MOCK_VALIDATORS.length,
  onlineValidators: ONLINE_VALIDATORS,
  averageBlockTime: 4.2,
  transactionsPerSecond: 128,
  connectedPeers: 7,
  syncedNodes: 6,
  protocolVersion: 'securex-v2',
  consensusMode: 'PERMISSIONED_POA',
  health: {
    status: 'HEALTHY',
    message: 'All nodes reachable and in sync. Block production proceeding normally.',
  },
  consensus: {
    mode: 'PERMISSIONED_POA',
    proposer: proposer?.name ?? 'SecureX Validator 01',
    minSignatures: 1,
    lastFinalizedHeight: 21,
  },
};

export const MOCK_PEERS: Peer[] = [...PRIMARY_PEERS, ...EXTRA_PEERS];
