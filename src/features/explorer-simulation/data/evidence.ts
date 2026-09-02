import type {
  AttackEvidence,
  AttackType,
  EvidenceLine,
  EvidenceStatusValue,
  MerkleProof,
  MerkleProofNode,
  VerificationStatus,
} from '../types';
import { getAttackScenarioById } from './attackScenarios';

// Deterministic, non-cryptographic demo hash formatter. This is NOT a real
// hash — it produces stable hex-looking strings so the UI can render consistent
// demo evidence without pretending to compute a real hash or signature.
function demoHash(seed: string, length = 64): string {
  const alphabet = '0123456789abcdef';
  let n = 0;
  for (let i = 0; i < seed.length; i++) {
    n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let out = '';
  let x = n;
  for (let i = 0; i < length; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    out += alphabet[x % 16];
  }
  return `0x${out}`;
}

function leafHashFrom(seed: string): string {
  return demoHash(`leaf:${seed}`, 64);
}

function buildMerkleProof(
  evaluationStatus: VerificationStatus,
  seed: string,
  transactionId: string,
  root: string,
): MerkleProof {
  const leaf = leafHashFrom(`${transactionId}:${seed}`);
  const sibMid = demoHash(`sib-mid:${seed}`, 64);
  const sibTop = demoHash(`sib-top:${seed}`, 64);

  const usesRealRoot = evaluationStatus === 'VALID';

  const path: MerkleProofNode[] = [
    { hash: leaf, position: 'leaf' },
    {
      hash: sibMid,
      position: 'intermediate',
      direction: 'right',
    },
    {
      hash: usesRealRoot ? sibTop : demoHash(`wrong-sib:${seed}`, 64),
      position: 'intermediate',
      direction: 'right',
    },
    { hash: root, position: 'root' },
  ];

  return {
    leafHash: leaf,
    rootHash: root,
    path,
    verificationStatus: evaluationStatus,
    detail:
      evaluationStatus === 'VALID'
        ? 'Proof combines to the recorded root.'
        : 'Proof does not combine to the recorded Merkle root.',
  };
}

export function buildAttackEvidence(
  simulationId: string,
  attackType: AttackType,
  blockHeight: number,
  transactionId: string,
): AttackEvidence {
  const scenario = getAttackScenarioById(
    `scn-${String(ATTACK_TYPE_INDEX[attackType] + 1).padStart(2, '0')}-${attackType.toLowerCase()}`,
  );

  const rejectedStatus: EvidenceStatusValue =
    attackType === 'FORGED_SIGNATURE' ||
    attackType === 'INVALID_LIFECYCLE_TRANSITION' ||
    attackType === 'UNAUTHORIZED_PROPOSER'
      ? 'REJECTED'
      : attackType === 'REPLAY_ATTACK'
        ? 'BLOCKED'
        : 'DETECTED';

  const txHash = demoHash(`tx:${transactionId}`, 64);
  const blockHash = demoHash(`block:${blockHeight}`, 64);
  const merkleRoot = demoHash(`root:${blockHeight}:${attackType}`, 64);
  const evidenceIdSeed = `evidence:${simulationId}`;
  const evidenceId = demoHash(evidenceIdSeed, 64);

  const merkleStatus: VerificationStatus =
    attackType === 'INVALID_MERKLE_PROOF' ? 'INVALID' : 'VALID';
  const merkle = buildMerkleProof(
    merkleStatus,
    `${simulationId}:${attackType}`,
    transactionId,
    merkleRoot,
  );

  const signature: AttackEvidence['signature'] = {
    status:
      attackType === 'FORGED_SIGNATURE' ? 'REJECTED' : 'VALID',
    reason:
      attackType === 'FORGED_SIGNATURE'
        ? 'Invalid transaction signature'
        : 'Transaction signature is valid',
    signer: scenario?.type === 'FORGED_SIGNATURE' ? undefined : 'validator:val-02',
    simulatedSignatureId:
      attackType === 'FORGED_SIGNATURE'
        ? demoHash(`sig:simulated:${simulationId}`, 64)
        : undefined,
  };

  const integrity: AttackEvidence['integrity'] = {
    status: merkleStatus === 'INVALID' ? 'INVALID' : 'VALID',
    reason:
      merkleStatus === 'INVALID'
        ? 'Merkle root does not match the recorded block header.'
        : 'Block hash and Merkle root match the recorded header.',
    blockHash,
    merkleRoot,
  };

  return {
    id: evidenceId,
    simulationId,
    evaluationStatus: rejectedStatus,
    summary: `${scenario?.name ?? 'Security scenario'} — ${rejectedStatus.toLowerCase()} by ${scenario?.securityControl ?? 'security control'}.`,
    resultMessage:
      attackType === 'FORGED_SIGNATURE'
        ? 'Signature validation rejected the transaction.'
        : attackType === 'REPLAY_ATTACK'
          ? 'Replay protection rejected the duplicate transaction.'
          : attackType === 'BLOCK_TAMPERING'
            ? 'Block integrity mismatch detected.'
            : attackType === 'UNAUTHORIZED_PROPOSER'
              ? 'Unauthorized proposer rejected.'
              : attackType === 'INVALID_MERKLE_PROOF'
                ? 'Invalid Merkle proof detected.'
                : 'Invalid lifecycle transition rejected.',
    transactionHash: txHash,
    blockHash,
    blockHeight,
    signature,
    merkleProof: merkle,
    integrity,
    timeline: [
      {
        label: 'Request received',
        timestamp: new Date(Date.now() - 4200).toISOString(),
        status: 'COMPLETED',
      },
      {
        label: 'Attack simulated',
        timestamp: new Date(Date.now() - 3600).toISOString(),
        status: 'COMPLETED',
      },
      {
        label: 'Security control evaluated',
        timestamp: new Date(Date.now() - 2400).toISOString(),
        status: 'COMPLETED',
      },
      {
        label: 'Defense triggered',
        timestamp: new Date(Date.now() - 1200).toISOString(),
        status: rejectedStatus,
      },
    ],
  };
}

const ATTACK_TYPE_INDEX: Record<AttackType, number> = {
  FORGED_SIGNATURE: 0,
  REPLAY_ATTACK: 1,
  BLOCK_TAMPERING: 2,
  UNAUTHORIZED_PROPOSER: 3,
  INVALID_MERKLE_PROOF: 4,
  INVALID_LIFECYCLE_TRANSITION: 5,
};

export function evidenceLines(evidence: AttackEvidence): EvidenceLine[] {
  return [
    {
      id: 'tx-hash',
      type: 'HASH',
      label: 'Transaction hash',
      value: evidence.transactionHash,
      status: 'VALID',
      detail: 'Identifier of the simulated transaction.',
      action: 'none',
    },
    {
      id: 'block-hash',
      type: 'BLOCK',
      label: 'Block hash',
      value: evidence.blockHash,
      status: 'VALID',
      detail: `Commit hash recorded for block ${evidence.blockHeight}.`,
      action: 'block',
      link: `/explorer/blocks/${evidence.blockHeight}`,
    },
    {
      id: 'signature',
      type: 'SIGNATURE',
      label: 'Signature validation',
      value: evidence.signature.status,
      status: evidence.signature.status,
      detail: evidence.signature.reason,
      action: 'none',
    },
    {
      id: 'merkle',
      type: 'MERKLE',
      label: 'Merkle proof',
      value: evidence.merkleProof.verificationStatus,
      status: evidence.merkleProof.verificationStatus,
      detail: evidence.merkleProof.detail,
      action: 'none',
    },
    {
      id: 'integrity',
      type: 'BLOCK',
      label: 'Block/transaction integrity',
      value: evidence.integrity.status,
      status: evidence.integrity.status,
      detail: evidence.integrity.reason,
      action: 'none',
    },
  ];
}

const SESSION_EVIDENCE = new Map<string, AttackEvidence>();

export function registerSessionEvidence(evidence: AttackEvidence): void {
  SESSION_EVIDENCE.set(evidence.simulationId, evidence);
}

export function getEvidenceBySimulationId(
  simulationId?: string,
): AttackEvidence | null {
  if (!simulationId) return null;
  const fromHistory = MOCK_EVIDENCE[simulationId];
  if (fromHistory) return fromHistory;
  return SESSION_EVIDENCE.get(simulationId) ?? null;
}

const MOCK_EVIDENCE: Record<string, AttackEvidence> = {
  'sim-0009': buildAttackEvidence('sim-0009', 'FORGED_SIGNATURE', 18, 'tx-00007f'),
  'sim-0010': buildAttackEvidence('sim-0010', 'REPLAY_ATTACK', 19, 'tx-000090'),
  'sim-0011': buildAttackEvidence('sim-0011', 'BLOCK_TAMPERING', 22, 'tx-0000a3'),
  'sim-0012': buildAttackEvidence('sim-0012', 'UNAUTHORIZED_PROPOSER', 23, 'tx-0000aa'),
  'sim-0013': buildAttackEvidence('sim-0013', 'INVALID_MERKLE_PROOF', 21, 'tx-0000b1'),
  'sim-0014': buildAttackEvidence('sim-0014', 'INVALID_LIFECYCLE_TRANSITION', 20, 'tx-0000c2'),
};
