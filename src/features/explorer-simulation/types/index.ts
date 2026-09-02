export type ValidatorStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING';

export type ValidatorRole =
  | 'BLOCK_PRODUCER'
  | 'VALIDATOR'
  | 'WITNESS';

export interface Validator {
  id: string;
  name: string;
  status: ValidatorStatus;
  role: ValidatorRole;
  identity: string;
  publicKey: string;
  currentHeight: number;
  blocksProposed: number;
  transactionsProcessed: number;
  lastSeen: string;
  joinedAt: string;
  version: string;
}

export type NetworkHealthStatus = 'HEALTHY' | 'DEGRADED' | 'SYNCING' | 'OFFLINE';

export type ConsensusMode = 'PERMISSIONED_POA';

export interface Peer {
  id: string;
  name: string;
  status: ValidatorStatus;
  height: number;
  latency: number;
  version: string;
  lastSeen: string;
}

export interface ConsensusStatus {
  mode: ConsensusMode;
  proposer: string;
  minSignatures: number;
  lastFinalizedHeight: number;
}

export interface NetworkHealth {
  status: NetworkHealthStatus;
  message: string;
}

export interface NetworkOverview {
  status: NetworkHealthStatus;
  currentHeight: number;
  latestBlockHash: string;
  totalNodes: number;
  onlineNodes: number;
  totalValidators: number;
  onlineValidators: number;
  averageBlockTime: number;
  transactionsPerSecond: number;
  connectedPeers: number;
  syncedNodes: number;
  protocolVersion: string;
  consensusMode: ConsensusMode;
  health: NetworkHealth;
  consensus: ConsensusStatus;
}

// ---------------------------------------------------------------------------
// Phase 2 — Attack Simulation + Security Evidence
// ---------------------------------------------------------------------------

export type AttackType =
  | 'FORGED_SIGNATURE'
  | 'REPLAY_ATTACK'
  | 'BLOCK_TAMPERING'
  | 'UNAUTHORIZED_PROPOSER'
  | 'INVALID_MERKLE_PROOF'
  | 'INVALID_LIFECYCLE_TRANSITION';

export type AttackSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AttackStatus =
  | 'DETECTED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'FAILED'
  | 'COMPLETED';

export type AttackResultStatus = 'DETECTED' | 'REJECTED' | 'BLOCKED' | 'FAILED';

export interface AttackScenario {
  id: string;
  type: AttackType;
  name: string;
  shortDescription: string;
  description: string;
  attack: string;
  expectedDefense: string;
  target: string;
  securityControl: string;
  severity: AttackSeverity;
  tags: string[];
}

export type SimulationStage =
  | 'PREPARING'
  | 'SUBMITTING'
  | 'VALIDATING'
  | 'CONTROL_EVALUATED'
  | 'DEFENSE_TRIGGERED'
  | 'EVIDENCE'
  | 'COMPLETE';

export interface SimulationStageState {
  key: SimulationStage;
  label: string;
  detail: string;
}

export interface AttackResult {
  id: string;
  scenarioId: string;
  scenarioName: string;
  attackType: AttackType;
  severity: AttackSeverity;
  status: AttackResultStatus;
  target: string;
  securityControl: string;
  resultMessage: string;
  defenseMessage: string;
  startedAt: string;
  completedAt: string;
  transactionId: string;
  blockHeight: number;
  evidenceId: string;
  relatedEventId: string;
}

// --- Evidence ---

export type VerificationStatus = 'VALID' | 'INVALID' | 'REJECTED' | 'PENDING';

export type EvidenceStatusValue =
  | 'VALID'
  | 'INVALID'
  | 'REJECTED'
  | 'DETECTED'
  | 'BLOCKED'
  | 'FAILED'
  | 'COMPLETED'
  | 'PENDING';

export type EvidenceType =
  | 'SIGNATURE'
  | 'HASH'
  | 'MERKLE'
  | 'BLOCK'
  | 'LIFECYCLE'
  | 'REPLAY';

export interface MerkleProofNode {
  hash: string;
  position: 'leaf' | 'sibling' | 'root' | 'intermediate';
  direction?: 'left' | 'right';
}

export interface MerkleProof {
  leafHash: string;
  rootHash: string;
  path: MerkleProofNode[];
  verificationStatus: VerificationStatus;
  detail: string;
}

export interface SignatureEvidence {
  status: VerificationStatus;
  reason: string;
  signer?: string;
  simulatedSignatureId?: string;
}

export interface EvidenceLine {
  id: string;
  type: EvidenceType;
  label: string;
  value: string;
  status: VerificationStatus;
  detail?: string;
  action?: 'transaction' | 'block' | 'none';
  link?: string;
}

export interface AttackEvidence {
  id: string;
  simulationId: string;
  evaluationStatus: EvidenceStatusValue;
  summary: string;
  resultMessage: string;
  transactionHash: string;
  blockHash: string;
  blockHeight: number;
  signature: SignatureEvidence;
  merkleProof: MerkleProof;
  integrity: {
    status: VerificationStatus;
    reason: string;
    blockHash: string;
    merkleRoot: string;
  };
  timeline: { label: string; timestamp: string; status: EvidenceStatusValue }[];
}

// --- Security events ---

export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: AttackSeverity;
  type: AttackType;
  source: string;
  target: string;
  status: AttackStatus;
  description: string;
  simulationId?: string;
  transactionId?: string;
  blockHeight?: number;
  title: string;
}

export interface ScenarioConfig {
  scenarioId: string;
  validatorId: string;
  includeTamperedPayload: boolean;
}
