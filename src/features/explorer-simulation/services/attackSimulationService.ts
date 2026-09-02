import type {
  AttackEvidence,
  AttackResult,
  AttackScenario,
  AttackType,
  ScenarioConfig,
  SecurityEvent,
  SimulationStageState,
} from '../types';
import {
  ATTACK_SCENARIOS,
  getAttackScenarioById,
} from '../data/attackScenarios';
import {
  MOCK_ATTACK_RESULTS,
  getAttackResultById,
  sortResultsNewestFirst,
} from '../data/attackResults';
import {
  buildAttackEvidence,
  getEvidenceBySimulationId,
  registerSessionEvidence,
} from '../data/evidence';
import {
  MOCK_SECURITY_EVENTS,
  getSecurityEventById,
} from '../data/securityEvents';
import { CURRENT_PROPOSER_ID } from '../data/validators';

export interface SimulationRunOutcome {
  result: AttackResult;
  evidence: AttackEvidence;
  event: SecurityEvent;
}

const DELAY_MS = 120;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// In-memory store so freshly-run simulations remain reachable in the session.
// This is intentionally not persisted and is clearly demo data.
const SESSION_RESULTS: AttackResult[] = [];
let _nextSimIndex = MOCK_ATTACK_RESULTS.length + 1;

const ISO_NOW = () => new Date().toISOString();

const STATUS_BY_TYPE: Record<AttackType, AttackResult['status']> = {
  FORGED_SIGNATURE: 'REJECTED',
  REPLAY_ATTACK: 'BLOCKED',
  BLOCK_TAMPERING: 'DETECTED',
  UNAUTHORIZED_PROPOSER: 'REJECTED',
  INVALID_MERKLE_PROOF: 'DETECTED',
  INVALID_LIFECYCLE_TRANSITION: 'REJECTED',
};

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

const MESSAGE_BY_TYPE: Record<AttackType, string> = {
  FORGED_SIGNATURE: 'Transaction signature validation rejected the forged signature.',
  REPLAY_ATTACK: 'Replay protection rejected the duplicate transaction.',
  BLOCK_TAMPERING: 'Block integrity mismatch detected; the tampered block was rejected.',
  UNAUTHORIZED_PROPOSER: 'Unauthorized proposer rejected; the block proposal was not accepted.',
  INVALID_MERKLE_PROOF: 'Invalid Merkle proof detected; the proof was rejected.',
  INVALID_LIFECYCLE_TRANSITION: 'Invalid lifecycle transition rejected; the state change was not applied.',
};

const RESULT_LABEL_BY_TYPE: Record<AttackType, string> = {
  FORGED_SIGNATURE: 'Rejected',
  REPLAY_ATTACK: 'Blocked',
  BLOCK_TAMPERING: 'Detected',
  UNAUTHORIZED_PROPOSER: 'Rejected',
  INVALID_MERKLE_PROOF: 'Detected',
  INVALID_LIFECYCLE_TRANSITION: 'Rejected',
};

function nextTransactionId(): string {
  const n = 0x30 + _nextSimIndex;
  return `tx-${n.toString(16)}`;
}

export async function getAttackScenarios(): Promise<AttackScenario[]> {
  await wait(DELAY_MS);
  return ATTACK_SCENARIOS;
}

export async function getSimulationResults(): Promise<AttackResult[]> {
  await wait(DELAY_MS);
  return sortResultsNewestFirst([...MOCK_ATTACK_RESULTS, ...SESSION_RESULTS]);
}

export async function getSimulationResult(id?: string): Promise<AttackResult | null> {
  await wait(DELAY_MS);
  return getAttackResultById(id) ?? SESSION_RESULTS.find((r) => r.id === id) ?? null;
}

export async function getAttackScenario(id?: string): Promise<AttackScenario | null> {
  await wait(DELAY_MS);
  return getAttackScenarioById(id ?? '');
}

export async function getSecurityEvidence(simulationId?: string): Promise<AttackEvidence | null> {
  await wait(DELAY_MS);
  return getEvidenceBySimulationId(simulationId);
}

export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  await wait(DELAY_MS);
  return [...MOCK_SECURITY_EVENTS];
}

export async function getSecurityEvent(id?: string): Promise<SecurityEvent | null> {
  await wait(DELAY_MS);
  return getSecurityEventById(id ?? '');
}

/**
 * Runs a controlled, deterministic simulation of the given attack scenario.
 * This does NOT execute any real blockchain operation and does NOT call any
 * backend endpoint — it produces demo result/evidence/event data locally.
 */
export async function runSimulation(
  scenarioId: string,
  _config: ScenarioConfig,
): Promise<SimulationRunOutcome> {
  const scenario = getAttackScenarioById(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown attack scenario: ${scenarioId}`);
  }

  await wait(DELAY_MS * 7);

  const simIndex = _nextSimIndex++;
  const id = `sim-${String(simIndex).padStart(4, '0')}`;
  const txId = nextTransactionId();
  const blockHeight = 22 + (simIndex - MOCK_ATTACK_RESULTS.length);
  const startedAt = ISO_NOW();
  const completedAt = ISO_NOW();

  const result: AttackResult = {
    id,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    attackType: scenario.type,
    severity: SEVERITY_BY_TYPE[scenario.type],
    status: STATUS_BY_TYPE[scenario.type],
    target: TARGET_BY_TYPE[scenario.type],
    securityControl: CONTROL_BY_TYPE[scenario.type],
    resultMessage: RESULT_LABEL_BY_TYPE[scenario.type],
    defenseMessage: MESSAGE_BY_TYPE[scenario.type],
    startedAt,
    completedAt,
    transactionId: txId,
    blockHeight,
    evidenceId: `ev-${id}`,
    relatedEventId: `evt-${id}`,
  };

  const evidence = buildAttackEvidence(id, scenario.type, blockHeight, txId);

  const event: SecurityEvent = {
    id: `evt-${id}`,
    timestamp: completedAt,
    severity: result.severity,
    type: scenario.type,
    source: `validator:${CURRENT_PROPOSER_ID}`,
    target: result.target,
    status: result.status,
    description: MESSAGE_BY_TYPE[scenario.type],
    simulationId: id,
    transactionId: txId,
    blockHeight,
    title: EVENT_TITLE_BY_TYPE[scenario.type],
  };

  SESSION_RESULTS.unshift(result);
  registerSessionEvidence(evidence);
  return { result, evidence, event };
}

const EVENT_TITLE_BY_TYPE: Record<AttackType, string> = {
  FORGED_SIGNATURE: 'Forged signature detected',
  REPLAY_ATTACK: 'Replay attempt rejected',
  BLOCK_TAMPERING: 'Block integrity mismatch detected',
  UNAUTHORIZED_PROPOSER: 'Unauthorized proposer rejected',
  INVALID_MERKLE_PROOF: 'Invalid Merkle proof detected',
  INVALID_LIFECYCLE_TRANSITION: 'Invalid lifecycle transition rejected',
};

export function getSimulationStages(): SimulationStageState[] {
  return [
    { key: 'PREPARING', label: 'Preparing scenario', detail: 'Setting up the controlled demonstration parameters.' },
    { key: 'SUBMITTING', label: 'Submitting simulated attack', detail: 'Dispatching the simulated request locally.' },
    { key: 'VALIDATING', label: 'Validating request', detail: 'Applying transaction and authorization checks.' },
    { key: 'CONTROL_EVALUATED', label: 'Security control evaluated', detail: 'The relevant security control has been applied.' },
    { key: 'DEFENSE_TRIGGERED', label: 'Attack detected / rejected', detail: 'The defensive control produced a result.' },
    { key: 'EVIDENCE', label: 'Generating evidence', detail: 'Assembling demo hash, signature, Merkle and block evidence.' },
    { key: 'COMPLETE', label: 'Simulation complete', detail: 'Result and evidence are ready to review.' },
  ];
}
