import type {
  AttackResult,
  AttackResultStatus,
  AttackType,
} from '../types';

interface SeedResult {
  id: string;
  scenarioId: string;
  scenarioName: string;
  attackType: AttackType;
  resultMessage: string;
  defenseMessage: string;
  transactionId: string;
  blockHeight: number;
  evidenceId: string;
  relatedEventId: string;
}

const iso = (offsetMinutes: number) =>
  new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();

function resultStatus(type: AttackType): AttackResultStatus {
  switch (type) {
    case 'FORGED_SIGNATURE':
      return 'REJECTED';
    case 'REPLAY_ATTACK':
      return 'BLOCKED';
    case 'BLOCK_TAMPERING':
      return 'DETECTED';
    case 'UNAUTHORIZED_PROPOSER':
      return 'REJECTED';
    case 'INVALID_MERKLE_PROOF':
      return 'DETECTED';
    case 'INVALID_LIFECYCLE_TRANSITION':
      return 'REJECTED';
    default:
      return 'FAILED';
  }
}

const SEED: SeedResult[] = [
  {
    id: 'sim-0009',
    scenarioId: 'scn-01-forged_signature',
    scenarioName: 'Forged Signature',
    attackType: 'FORGED_SIGNATURE',
    resultMessage: 'Rejected',
    defenseMessage: 'Transaction signature validation rejected the forged signature.',
    transactionId: 'tx-00007f',
    blockHeight: 18,
    evidenceId: 'evi-0009',
    relatedEventId: 'evt-sec-1001',
  },
  {
    id: 'sim-0010',
    scenarioId: 'scn-02-replay_attack',
    scenarioName: 'Replay Attack (Duplicate Submission)',
    attackType: 'REPLAY_ATTACK',
    resultMessage: 'Blocked',
    defenseMessage: 'Replay protection rejected the duplicate transaction.',
    transactionId: 'tx-000090',
    blockHeight: 19,
    evidenceId: 'evi-0010',
    relatedEventId: 'evt-sec-1002',
  },
  {
    id: 'sim-0011',
    scenarioId: 'scn-03-block_tampering',
    scenarioName: 'Block Tampering (Hash Mismatch)',
    attackType: 'BLOCK_TAMPERING',
    resultMessage: 'Detected',
    defenseMessage: 'Block integrity mismatch detected; the tampered block was rejected.',
    transactionId: 'tx-0000a3',
    blockHeight: 22,
    evidenceId: 'evi-0011',
    relatedEventId: 'evt-sec-1003',
  },
  {
    id: 'sim-0012',
    scenarioId: 'scn-04-unauthorized_proposer',
    scenarioName: 'Unauthorized Proposer',
    attackType: 'UNAUTHORIZED_PROPOSER',
    resultMessage: 'Rejected',
    defenseMessage: 'Unauthorized proposer rejected; the block proposal was not accepted.',
    transactionId: 'tx-0000aa',
    blockHeight: 23,
    evidenceId: 'evi-0012',
    relatedEventId: 'evt-sec-1004',
  },
  {
    id: 'sim-0013',
    scenarioId: 'scn-05-invalid_merkle_proof',
    scenarioName: 'Invalid Merkle Proof',
    attackType: 'INVALID_MERKLE_PROOF',
    resultMessage: 'Detected',
    defenseMessage: 'Invalid Merkle proof detected; the proof was rejected.',
    transactionId: 'tx-0000b1',
    blockHeight: 21,
    evidenceId: 'evi-0013',
    relatedEventId: 'evt-sec-1005',
  },
  {
    id: 'sim-0014',
    scenarioId: 'scn-06-invalid_lifecycle_transition',
    scenarioName: 'Invalid Lifecycle Transition',
    attackType: 'INVALID_LIFECYCLE_TRANSITION',
    resultMessage: 'Rejected',
    defenseMessage: 'Invalid lifecycle transition rejected; the state change was not applied.',
    transactionId: 'tx-0000c2',
    blockHeight: 20,
    evidenceId: 'evi-0014',
    relatedEventId: 'evt-sec-1006',
  },
];

const SEVERITY_BY_TYPE: Record<AttackType, AttackResult['severity']> = {
  FORGED_SIGNATURE: 'CRITICAL',
  REPLAY_ATTACK: 'HIGH',
  BLOCK_TAMPERING: 'CRITICAL',
  UNAUTHORIZED_PROPOSER: 'HIGH',
  INVALID_MERKLE_PROOF: 'MEDIUM',
  INVALID_LIFECYCLE_TRANSITION: 'HIGH',
};

const TARGET_BY_TYPE: Record<AttackType, string> = {
  FORGED_SIGNATURE: 'Transaction signature',
  REPLAY_ATTACK: 'Transaction replay',
  BLOCK_TAMPERING: 'Committed block',
  UNAUTHORIZED_PROPOSER: 'Block proposal',
  INVALID_MERKLE_PROOF: 'Merkle root',
  INVALID_LIFECYCLE_TRANSITION: 'Credential lifecycle',
};

const CONTROL_BY_TYPE: Record<AttackType, string> = {
  FORGED_SIGNATURE: 'Transaction signature validation',
  REPLAY_ATTACK: 'Replay protection',
  BLOCK_TAMPERING: 'Block integrity validation',
  UNAUTHORIZED_PROPOSER: 'Permissioned proposer authorization',
  INVALID_MERKLE_PROOF: 'Merkle proof validation',
  INVALID_LIFECYCLE_TRANSITION: 'Lifecycle state machine validation',
};

export const MOCK_ATTACK_RESULTS: AttackResult[] = SEED.map((seed, index) => ({
  id: seed.id,
  scenarioId: seed.scenarioId,
  scenarioName: seed.scenarioName,
  attackType: seed.attackType,
  severity: SEVERITY_BY_TYPE[seed.attackType],
  status: resultStatus(seed.attackType),
  target: TARGET_BY_TYPE[seed.attackType],
  securityControl: CONTROL_BY_TYPE[seed.attackType],
  resultMessage: seed.resultMessage,
  defenseMessage: seed.defenseMessage,
  startedAt: iso(3000 - index * 120),
  completedAt: iso(3000 - index * 120 + 4),
  transactionId: seed.transactionId,
  blockHeight: seed.blockHeight,
  evidenceId: seed.evidenceId,
  relatedEventId: seed.relatedEventId,
}));

export function getAttackResultById(
  id?: string,
): AttackResult | null {
  if (!id) return null;
  return MOCK_ATTACK_RESULTS.find((r) => r.id === id) ?? null;
}

export function sortResultsNewestFirst(results: AttackResult[]): AttackResult[] {
  return [...results].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}
