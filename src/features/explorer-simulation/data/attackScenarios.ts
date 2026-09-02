import type { AttackScenario, AttackType } from '../types';

function scenarioId(type: AttackType, index: number): string {
  return `scn-${String(index).padStart(2, '0')}-${type.toLowerCase()}`;
}

export const ATTACK_SCENARIOS: AttackScenario[] = [
  {
    id: scenarioId('FORGED_SIGNATURE', 1),
    type: 'FORGED_SIGNATURE',
    name: 'Forged Signature',
    shortDescription:
      'An unauthorized party attempts to submit a credential transaction signed with an invalid signature.',
    description:
      'The simulation submits a transaction carrying a signature that does not correspond to an authorized SecureX validator. Transaction validation inspects the signature before the transaction is recorded.',
    attack:
      'Submit a credential transaction with an invalid signature.',
    expectedDefense:
      'Transaction validation rejects the forged signature and does not record the transaction.',
    target: 'Transaction signature',
    securityControl: 'Transaction signature validation',
    severity: 'CRITICAL',
    tags: ['authentication', 'transaction'],
  },
  {
    id: scenarioId('REPLAY_ATTACK', 2),
    type: 'REPLAY_ATTACK',
    name: 'Replay Attack (Duplicate Submission)',
    shortDescription:
      'A previously recorded transaction is re-submitted in an attempt to be processed a second time.',
    description:
      'The simulation re-submits a transaction that has already been recorded on the network. Replay protection compares the incoming transaction against recently processed transactions to detect duplicates.',
    attack:
      'Re-submit an already-recorded transaction to be processed a second time.',
    expectedDefense:
      'Replay protection rejects the duplicate transaction.',
    target: 'Transaction replay',
    securityControl: 'Replay protection',
    severity: 'HIGH',
    tags: ['replay', 'transaction'],
  },
  {
    id: scenarioId('BLOCK_TAMPERING', 3),
    type: 'BLOCK_TAMPERING',
    name: 'Block Tampering (Hash Mismatch)',
    shortDescription:
      'The contents of a committed block are altered after the block was produced and finalized.',
    description:
      'The simulation points at a committed block whose stored data differs from the block hash that nodes agreed on. Nodes re-check the block hash against the recorded header to detect the mismatch.',
    attack:
      'Alter the contents of a committed block after finalization.',
    expectedDefense:
      'Block integrity mismatch detected; the tampered block is rejected from the canonical chain.',
    target: 'Committed block',
    securityControl: 'Block integrity validation',
    severity: 'CRITICAL',
    tags: ['integrity', 'block'],
  },
  {
    id: scenarioId('UNAUTHORIZED_PROPOSER', 4),
    type: 'UNAUTHORIZED_PROPOSER',
    name: 'Unauthorized Proposer',
    shortDescription:
      'A node that is not an authorized block producer attempts to propose the next block.',
    description:
      'In a permissioned Proof of Authority network only an authorized single proposer may produce the next block. The simulation attempts to submit a block from a node without the proposer role.',
    attack:
      'A non-authorized node attempts to propose the next block.',
    expectedDefense:
      'Unauthorized proposer rejected; the block proposal is not accepted.',
    target: 'Block proposal',
    securityControl: 'Permissioned proposer authorization',
    severity: 'HIGH',
    tags: ['authorization', 'block'],
  },
  {
    id: scenarioId('INVALID_MERKLE_PROOF', 5),
    type: 'INVALID_MERKLE_PROOF',
    name: 'Invalid Merkle Proof',
    shortDescription:
      'A transaction is submitted whose Merkle proof does not commit to the recorded root.',
    description:
      'The simulation presents a Merkle proof for a transaction that does not actually combine to the network Merkle root stored in the block header. The proof is checked against the root to detect the mismatch.',
    attack:
      'Submit a transaction alongside a Merkle proof that does not match the recorded root.',
    expectedDefense:
      'Invalid Merkle proof detected; the proof is rejected.',
    target: 'Merkle root',
    securityControl: 'Merkle proof validation',
    severity: 'MEDIUM',
    tags: ['integrity', 'merkle', 'transaction'],
  },
  {
    id: scenarioId('INVALID_LIFECYCLE_TRANSITION', 6),
    type: 'INVALID_LIFECYCLE_TRANSITION',
    name: 'Invalid Lifecycle Transition',
    shortDescription:
      'A credential is moved to a state that is not allowed from its current lifecycle state.',
    description:
      'The simulation attempts to transition a credential between lifecycle states that are not permitted by the credential state machine (for example, moving a revoked credential to active).',
    attack:
      'Attempt an illegal credential lifecycle state transition.',
    expectedDefense:
      'Invalid lifecycle transition rejected; the state change is not applied.',
    target: 'Credential lifecycle',
    securityControl: 'Lifecycle state machine validation',
    severity: 'HIGH',
    tags: ['lifecycle', 'credential'],
  },
];

export function getAttackScenarioById(id: string): AttackScenario | null {
  return ATTACK_SCENARIOS.find((s) => s.id === id) ?? null;
}
