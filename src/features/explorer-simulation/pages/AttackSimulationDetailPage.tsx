import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  PlayCircle,
  ShieldX,
  UserX,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
} from '@/components/ui';
import { formatDate } from '@/utils';
import type {
  AttackResult,
  AttackScenario,
  ScenarioConfig,
} from '../types';
import {
  getAttackScenario,
  getSimulationResult,
  getSimulationStages,
  runSimulation,
} from '../services/attackSimulationService';
import { CURRENT_PROPOSER_ID } from '../data/validators';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { EvidenceStatus } from '../components/EvidenceStatus';
import { SeverityBadge } from '../components/SeverityBadge';
import { SimulationProgress } from '../components/SimulationProgress';
import { InfoRow } from '../components/InfoRow';

export default function AttackSimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [kind, setKind] = useState<'scenario' | 'result' | null>(null);
  const [scenario, setScenario] = useState<AttackScenario | null>(null);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [newResult, setNewResult] = useState<AttackResult | null>(null);
  const [config, setConfig] = useState<ScenarioConfig>({
    scenarioId: '',
    validatorId: CURRENT_PROPOSER_ID,
    includeTamperedPayload: false,
  });
  const outcomeStarted = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const outcomeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
      }
      if (outcomeTimeoutRef.current !== null) {
        window.clearTimeout(outcomeTimeoutRef.current);
      }
    };
  }, []);

  const stages = useMemo(() => getSimulationStages(), []);

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      try {
        const [resultData, scenarioData] = await Promise.all([
          getSimulationResult(id),
          getAttackScenario(id),
        ]);
        if (!active) return;
        if (resultData) {
          setKind('result');
          setResult(resultData);
        } else if (scenarioData) {
          setKind('scenario');
          setScenario(scenarioData);
          setConfig((c) => ({ ...c, scenarioId: scenarioData.id }));
        } else {
          setKind(null);
        }
        setLoadError(null);
      } catch (e) {
        if (active) {
          setLoadError(e instanceof Error ? e.message : 'Unable to load simulation.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!running || stageIndex < stages.length - 1 || outcomeStarted.current) return;
    outcomeStarted.current = true;
    if (!scenario) return;
    void runSimulation(scenario.id, config)
      .then((outcome) => {
        setNewResult(outcome.result);
        setKind('result');
        setResult(outcome.result);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Simulation failed to run.');
      })
      .finally(() => setRunning(false));
  }, [running, stageIndex, scenario, config, stages.length]);

  function handleRun() {
    if (!scenario) return;
    outcomeStarted.current = false;
    setRunning(true);
    setNewResult(null);
    setStageIndex(0);
    const timer = window.setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, 400);
    progressTimerRef.current = timer;
    outcomeTimeoutRef.current = window.setTimeout(() => {
      window.clearInterval(timer);
      progressTimerRef.current = null;
    }, stages.length * 400 + 600);
  }

  const complete = Boolean(newResult);
  const shownResult = result;
  const shownScenario = scenario;

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Attack simulation detail breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            { label: 'Attack Simulation', href: '/explorer/attack-simulation' },
            {
              label: shownScenario?.name ?? shownResult?.scenarioName ?? 'Simulation',
              active: true,
            },
          ]}
        />

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/explorer/attack-simulation')}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Attack Simulation
          </Button>
          {shownResult && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/explorer/security/evidence/${shownResult.id}`)}
              rightIcon={<ExternalLink aria-hidden="true" className="h-4 w-4" />}
            >
              View security evidence
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
        ) : loadError ? (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-danger-600">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Card>
        ) : kind === null ? (
          <EmptyState
            icon={<UserX aria-hidden="true" className="h-7 w-7" />}
            title="Simulation not found"
            description={`No attack simulation or scenario matches "${id}".`}
            actionButton={{
              label: 'Back to attack simulation',
              onClick: () => navigate('/explorer/attack-simulation'),
            }}
          />
        ) : shownScenario && kind === 'scenario' ? (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-neutral-900">
                  <FlaskConical aria-hidden="true" className="h-6 w-6 text-securex-600" />
                  {shownScenario.name}
                </h1>
                <span className="inline-flex items-center gap-2">
                  <SeverityBadge severity={shownScenario.severity} />
                  <Badge variant="info">{attackTypeLabel(shownScenario.type)}</Badge>
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-neutral-500">
                {shownScenario.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Attack" bodyClassName="p-0">
                <dl className="divide-y divide-neutral-100 px-5">
                  <InfoRow label="Target" value={shownScenario.target} />
                  <InfoRow
                    label="Attack behavior"
                    value={<span className="text-neutral-700">{shownScenario.attack}</span>}
                  />
                </dl>
              </Card>
              <Card title="Expected defense" bodyClassName="p-0">
                <dl className="divide-y divide-neutral-100 px-5">
                  <InfoRow label="Security control" value={shownScenario.securityControl} />
                  <InfoRow
                    label="Expected outcome"
                    value={<span className="text-neutral-700">{shownScenario.expectedDefense}</span>}
                  />
                </dl>
              </Card>
            </div>

            <Alert
              variant="warning"
              title="Controlled simulation"
            >
              Running this simulation does not perform any real network operation.
              It demonstrates the expected defensive control outcome using demo data.
            </Alert>

            <Card title="Configure scenario">
              <div className="space-y-0">
                <InfoRow label="Simulation ID" value={<span className="font-mono text-xs">Assigned on run</span>} />
                <InfoRow label="Authorized proposer" value={CURRENT_PROPOSER_ID} />
                <InfoRow
                  label="Simulated direction"
                  value={config.includeTamperedPayload ? 'Tampered payload' : 'Standard payload'}
                />
              </div>

              {running ? (
                <div className="mt-6">
                  <SimulationProgress
                    steps={stages}
                    currentIndex={stageIndex}
                    complete={complete}
                  />
                </div>
              ) : complete && newResult ? (
                <ResultSummary result={newResult} onViewEvidence={() => navigate(`/explorer/security/evidence/${newResult.id}`)} />
              ) : (
                <div className="mt-6 flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleRun()}
                    leftIcon={<PlayCircle aria-hidden="true" className="h-5 w-5" />}
                  >
                    Run simulation
                  </Button>
                  <p className="text-xs text-neutral-400">
                    Takes a few seconds to progress through the checks.
                  </p>
                </div>
              )}
            </Card>
          </>
        ) : shownResult ? (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                  {shownResult.scenarioName}
                </h1>
                <span className="inline-flex items-center gap-2">
                  <SeverityBadge severity={shownResult.severity} />
                  <Badge variant="info">{attackTypeLabel(shownResult.attackType)}</Badge>
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-neutral-400">{shownResult.id}</p>
            </div>

            <ResultSummary
              result={shownResult}
              onViewEvidence={() => navigate(`/explorer/security/evidence/${shownResult.id}`)}
            />
          </>
        ) : null}
      </div>
    </ExplorerLayout>
  );
}

function ResultSummary({
  result,
  onViewEvidence,
}: {
  result: AttackResult;
  onViewEvidence: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isDetectedOrRejected(result.status) ? (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-600">
              <ShieldX aria-hidden="true" className="h-6 w-6" />
            </span>
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-50 text-warning-600">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
            </span>
          )}
          <div>
            <p className="text-sm text-neutral-500">Detection result</p>
            <div className="mt-0.5">
              <EvidenceStatus status={result.status} size="md" />
            </div>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={onViewEvidence}>
          View security evidence
        </Button>
      </div>

      <dl className="mt-6 divide-y divide-neutral-100 border-t border-neutral-100">
        <InfoRow label="Attack type" value={attackTypeLabel(result.attackType)} />
        <InfoRow label="Target" value={result.target} />
        <InfoRow label="Security control" value={result.securityControl} />
        <InfoRow
          label="Defense result"
          value={<span className="text-neutral-700">{result.defenseMessage}</span>}
        />
        <InfoRow label="Started" value={formatDate(result.startedAt)} />
        <InfoRow label="Completed" value={formatDate(result.completedAt)} />
        <InfoRow
          label="Related transaction"
          value={<span className="font-mono text-xs">{result.transactionId}</span>}
        />
        <InfoRow label="Related block" value={`#${result.blockHeight}`} />
        <InfoRow label="Evidence" value={result.evidenceId} />
      </dl>
    </Card>
  );
}

function isDetectedOrRejected(status: AttackResult['status']): boolean {
  return status === 'DETECTED' || status === 'REJECTED' || status === 'BLOCKED';
}

function attackTypeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

function SkeletonBlock() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="h-5 w-40 animate-pulse rounded bg-neutral-100" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-neutral-100" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}
