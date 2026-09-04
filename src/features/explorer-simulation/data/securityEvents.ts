import type { SecurityEvent } from '../types';

const iso = (offsetMinutes: number) =>
  new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();

export const MOCK_SECURITY_EVENTS: SecurityEvent[] = [
  {
    id: 'evt-sec-1006',
    timestamp: iso(18),
    severity: 'HIGH',
    type: 'INVALID_LIFECYCLE_TRANSITION',
    source: 'validator:val-03',
    target: 'credential:cred-0091',
    status: 'REJECTED',
    description:
      'Invalid lifecycle transition rejected — a revoked credential was denied an illegal state change.',
    simulationId: 'sim-0014',
    transactionId: 'tx-0000c2',
    blockHeight: 20,
    title: 'Invalid lifecycle transition rejected',
  },
  {
    id: 'evt-sec-1005',
    timestamp: iso(55),
    severity: 'MEDIUM',
    type: 'INVALID_MERKLE_PROOF',
    source: 'validator:val-02',
    target: 'block:21',
    status: 'DETECTED',
    description:
      'Invalid Merkle proof detected — a transaction proof did not commit to the recorded root.',
    simulationId: 'sim-0013',
    transactionId: 'tx-0000b1',
    blockHeight: 21,
    title: 'Invalid Merkle proof detected',
  },
  {
    id: 'evt-sec-1004',
    timestamp: iso(120),
    severity: 'HIGH',
    type: 'UNAUTHORIZED_PROPOSER',
    source: 'node:node-07',
    target: 'block:23',
    status: 'REJECTED',
    description:
      'Unauthorized proposer rejected — a non-authorized node attempted to propose a block.',
    simulationId: 'sim-0012',
    blockHeight: 23,
    title: 'Unauthorized proposer rejected',
  },
  {
    id: 'evt-sec-1003',
    timestamp: iso(260),
    severity: 'CRITICAL',
    type: 'BLOCK_TAMPERING',
    source: 'validator:val-01',
    target: 'block:22',
    status: 'DETECTED',
    description:
      'Block integrity mismatch detected — a committed block hash did not match its recorded header.',
    simulationId: 'sim-0011',
    transactionId: 'tx-0000a3',
    blockHeight: 22,
    title: 'Block integrity mismatch detected',
  },
  {
    id: 'evt-sec-1002',
    timestamp: iso(1400),
    severity: 'HIGH',
    type: 'REPLAY_ATTACK',
    source: 'validator:val-02',
    target: 'transaction:tx-000090',
    status: 'BLOCKED',
    description:
      'Replay attempt rejected — an already-recorded transaction was re-submitted.',
    simulationId: 'sim-0010',
    transactionId: 'tx-000090',
    blockHeight: 19,
    title: 'Replay attempt rejected',
  },
  {
    id: 'evt-sec-1001',
    timestamp: iso(3000),
    severity: 'CRITICAL',
    type: 'FORGED_SIGNATURE',
    source: 'validator:val-03',
    target: 'transaction:tx-00007f',
    status: 'REJECTED',
    description:
      'Forged signature detected — transaction validation rejected the invalid signature.',
    simulationId: 'sim-0009',
    transactionId: 'tx-00007f',
    blockHeight: 18,
    title: 'Forged signature detected',
  },
];

export function getSecurityEventById(id: string): SecurityEvent | null {
  return MOCK_SECURITY_EVENTS.find((e) => e.id === id) ?? null;
}
