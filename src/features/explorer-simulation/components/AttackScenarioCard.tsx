import { ArrowRight, ShieldCheck, Swords } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type { AttackScenario } from '../types';
import { SeverityBadge } from './SeverityBadge';

export function AttackScenarioCard({
  scenario,
  onSelect,
}: {
  scenario: AttackScenario;
  onSelect: (scenario: AttackScenario) => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-securex transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-lg bg-danger-50 p-2 text-danger-600">
          <Swords aria-hidden="true" className="h-5 w-5" />
        </span>
        <SeverityBadge severity={scenario.severity} />
      </div>

      <h3 className="mt-4 flex items-center gap-2 text-base font-semibold text-neutral-900">
        <ShieldCheck aria-hidden="true" className="h-4 w-4 text-securex-600" />
        {scenario.name}
      </h3>
      <p className="mt-1.5 text-sm text-neutral-500">{scenario.shortDescription}</p>

      <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-danger-600">
            Attack
          </p>
          <p className="mt-1 text-sm text-neutral-700">{scenario.attack}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-trust-600">
            Expected defense
          </p>
          <p className="mt-1 text-sm text-neutral-700">{scenario.expectedDefense}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="default" size="sm">
            {scenario.securityControl}
          </Badge>
          {scenario.tags.map((tag) => (
            <Badge key={tag} variant="info" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => onSelect(scenario)}
          rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
        >
          Configure &amp; run
        </Button>
      </div>
    </div>
  );
}
