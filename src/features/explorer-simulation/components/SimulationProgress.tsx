import { Check, LoaderCircle } from 'lucide-react';
import { classNames } from '@/utils';

export interface ProgressStep {
  key: string;
  label: string;
  detail?: string;
}

export function SimulationProgress({
  steps,
  currentIndex,
  complete,
}: {
  steps: ProgressStep[];
  currentIndex: number;
  complete: boolean;
}) {
  return (
    <ol className="space-y-0" aria-label="Simulation progress">
      {steps.map((step, index) => {
        const isDone = complete || index < currentIndex;
        const isActive = !complete && index === currentIndex;
        const isLast = index === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={classNames(
                  'absolute left-[15px] top-8 h-[calc(100%-24px)] w-px',
                  index < currentIndex || complete
                    ? 'bg-trust-400'
                    : 'bg-neutral-200',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={classNames(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                isDone && 'border-trust-500 bg-trust-500 text-white',
                isActive &&
                  'border-securex-500 bg-securex-50 text-securex-600',
                !isDone && !isActive && 'border-neutral-200 bg-white text-neutral-400',
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4" />
              ) : isActive ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-xs font-semibold">{index + 1}</span>
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={classNames(
                  'text-sm font-medium',
                  isActive || isDone ? 'text-neutral-900' : 'text-neutral-400',
                )}
              >
                {step.label}
              </p>
              {isActive && step.detail && (
                <p className="mt-0.5 text-xs text-neutral-500">{step.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
