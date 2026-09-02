import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  History,
  Swords,
  UserX,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Breadcrumb,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components/ui';
import { formatDate } from '@/utils';
import type { AttackResult, AttackScenario } from '../types';
import {
  getAttackScenarios,
  getSimulationResults,
} from '../services/attackSimulationService';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { AttackScenarioCard } from '../components/AttackScenarioCard';
import { EvidenceStatus } from '../components/EvidenceStatus';
import { SeverityBadge } from '../components/SeverityBadge';

export default function AttackSimulationPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [results, setResults] = useState<AttackResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [scenarioData, resultsData] = await Promise.all([
          getAttackScenarios(),
          getSimulationResults(),
        ]);
        if (!active) return;
        setScenarios(scenarioData);
        setResults(resultsData);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Unable to load attack simulations.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Attack simulation breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            { label: 'Attack Simulation', active: true },
          ]}
        />

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-neutral-900">
            <FlaskConical aria-hidden="true" className="h-6 w-6 text-securex-600" />
            Attack Simulation
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            SecureX provides controlled demonstrations of credential and blockchain
            security protections. Select an attack scenario to run a defensive
            simulation showing how the permissioned SecureX Trust Network detects
            and rejects malicious operations.
          </p>
        </div>

        <Alert
          variant="info"
          title="Controlled demonstration"
        >
          These scenarios are simulations run locally with demo data. No real
          network operation is executed, and no unauthorized action is performed.
        </Alert>

        {error ? (
          <ErrorState
            title="Could not load attack simulations"
            description={error}
            onRetry={() => {
              setError(null);
              setLoading(true);
              getAttackScenarios()
                .then(setScenarios)
                .then(() => getSimulationResults())
                .then(setResults)
                .catch((e) =>
                  setError(e instanceof Error ? e.message : 'Unable to load attack simulations.'),
                )
                .finally(() => setLoading(false));
            }}
            retryLabel="Retry"
          />
        ) : (
          <>
            <section aria-labelledby="scenarios-heading">
              <div className="mb-4 flex items-center gap-2">
                <Swords aria-hidden="true" className="h-5 w-5 text-danger-600" />
                <h2 id="scenarios-heading" className="text-lg font-semibold text-neutral-900">
                  Select an attack scenario
                </h2>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="mt-4 h-5 w-40" />
                      <Skeleton className="mt-2 h-4 w-full" />
                      <Skeleton className="mt-2 h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {scenarios.map((scenario) => (
                    <AttackScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onSelect={(selected) =>
                        navigate(`/explorer/attack-simulation/${selected.id}`)
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="history-heading" className="pt-2">
              <div className="mb-4 flex items-center gap-2">
                <History aria-hidden="true" className="h-5 w-5 text-securex-600" />
                <h2 id="history-heading" className="text-lg font-semibold text-neutral-900">
                  Simulation history
                </h2>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <EmptyState
                  compact
                  icon={<UserX aria-hidden="true" className="h-6 w-6" />}
                  title="No simulations yet"
                  description="Run an attack simulation to see its results here."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-securex">
                  <table className="min-w-full" aria-label="Attack simulation history">
                    <thead className="bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      <tr>
                        <th className="px-4 py-3">Simulation</th>
                        <th className="px-4 py-3">Attack type</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Result</th>
                        <th className="px-4 py-3">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {results.map((result) => (
                        <tr
                          key={result.id}
                          onClick={() => navigate(`/explorer/attack-simulation/${result.id}`)}
                          className="cursor-pointer transition-colors hover:bg-neutral-50"
                        >
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs text-securex-700">{result.id}</span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-neutral-700">{result.scenarioName}</td>
                          <td className="px-4 py-3.5">
                            <SeverityBadge severity={result.severity} />
                          </td>
                          <td className="px-4 py-3.5">
                            <EvidenceStatus status={result.status} />
                          </td>
                          <td className="px-4 py-3.5 text-sm text-neutral-500">
                            {formatDate(result.completedAt, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {results.length > 0 && (
                <p className="mt-3 text-xs text-neutral-400">
                  Simulation history is demo data and resets with the session.
                </p>
              )}
            </section>
          </>
        )}

        <Alert variant="info" className="border-dashed" action={<Badge variant="info">Demo</Badge>}>
          Attack simulation results and evidence are generated locally and are
          illustrative of SecureX defense-in-depth controls.
        </Alert>
      </div>
    </ExplorerLayout>
  );
}
