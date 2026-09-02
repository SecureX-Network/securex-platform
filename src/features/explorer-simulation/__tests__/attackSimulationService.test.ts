import { describe, expect, it } from 'vitest';
import { getAttackScenarioById } from '../data/attackScenarios';
import {
  getEvidenceBySimulationId,
  buildAttackEvidence,
} from '../data/evidence';
import {
  getAttackScenarios,
  runSimulation,
  getSecurityEvidence,
  getSimulationResult,
  getSimulationStages,
} from '../services/attackSimulationService';
import type { ScenarioConfig } from '../types';

describe('attackSimulationService', () => {
  it('exposes all six attack scenarios', async () => {
    const scenarios = await getAttackScenarios();
    expect(scenarios).toHaveLength(6);
    expect(scenarios.map((s) => s.type)).toEqual(
      expect.arrayContaining([
        'FORGED_SIGNATURE',
        'REPLAY_ATTACK',
        'BLOCK_TAMPERING',
        'UNAUTHORIZED_PROPOSER',
        'INVALID_MERKLE_PROOF',
        'INVALID_LIFECYCLE_TRANSITION',
      ]),
    );
  });

  it('looks up a scenario by id', () => {
    const scenario = getAttackScenarioById('scn-01-forged_signature');
    expect(scenario?.name).toBe('Forged Signature');
    expect(scenario?.type).toBe('FORGED_SIGNATURE');
  });

  it('runs a forged-signature simulation deterministically', async () => {
    const config: ScenarioConfig = {
      scenarioId: 'scn-01-forged_signature',
      validatorId: 'val-01',
      includeTamperedPayload: false,
    };
    const outcome = await runSimulation('scn-01-forged_signature', config);

    expect(outcome.result.scenarioName).toBe('Forged Signature');
    expect(outcome.result.status).toBe('REJECTED');
    expect(outcome.result.severity).toBe('CRITICAL');
    expect(outcome.result.securityControl).toBe('Transaction signature validation');
    expect(outcome.evidence.simulationId).toBe(outcome.result.id);
    expect(outcome.evidence.signature.status).toBe('REJECTED');
    expect(outcome.event.title).toBe('Forged signature detected');
    expect(outcome.event.simulationId).toBe(outcome.result.id);
  });

  it('stores freshly-run evidence in the session store', async () => {
    const config: ScenarioConfig = {
      scenarioId: 'scn-03-block_tampering',
      validatorId: 'val-01',
      includeTamperedPayload: true,
    };
    const outcome = await runSimulation('scn-03-block_tampering', config);

    const evidence = await getSecurityEvidence(outcome.result.id);
    expect(evidence?.simulationId).toBe(outcome.result.id);
    expect(evidence?.evaluationStatus).toBe('DETECTED');
    expect(evidence?.resultMessage).toContain('Block integrity mismatch');
  });

  it('resolves evidence for seeded history results', async () => {
    const result = await getSimulationResult('sim-0009');
    expect(result?.status).toBe('REJECTED');
    const evidence = getEvidenceBySimulationId('sim-0009');
    expect(evidence?.resultMessage).toContain('rejected the transaction');
    expect(evidence?.signature.status).toBe('REJECTED');
  });

  it('throws for an unknown scenario', async () => {
    const config: ScenarioConfig = {
      scenarioId: 'scn-00-does-not-exist',
      validatorId: 'val-01',
      includeTamperedPayload: false,
    };
    await expect(runSimulation('scn-00-does-not-exist', config)).rejects.toThrow(
      /Unknown attack scenario/,
    );
  });

  it('defines a seven-stage simulation progress', () => {
    const stages = getSimulationStages();
    expect(stages).toHaveLength(7);
    expect(stages.map((s) => s.key)).toEqual([
      'PREPARING',
      'SUBMITTING',
      'VALIDATING',
      'CONTROL_EVALUATED',
      'DEFENSE_TRIGGERED',
      'EVIDENCE',
      'COMPLETE',
    ]);
  });

  it('builds demo evidence WITHOUT exposing private keys', () => {
    const evidence = buildAttackEvidence('sim-test-1', 'FORGED_SIGNATURE', 22, 'tx-test');
    const json = JSON.stringify(evidence);
    expect(json).not.toMatch(/privateKey|secretKey|privkey|mnemonic/i);
  });
});