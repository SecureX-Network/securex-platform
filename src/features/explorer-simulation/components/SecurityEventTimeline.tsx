import { CheckCircle2, ShieldAlert, Timer } from 'lucide-react';
import { Card } from '@/components/ui';
import { formatDate } from '@/utils';
import type { EvidenceStatusValue, SecurityEvent } from '../types';
import { EvidenceStatus } from './EvidenceStatus';

function timelineIcon(status: EvidenceStatusValue) {
  if (status === 'COMPLETED') {
    return <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-trust-600" />;
  }
  return <ShieldAlert aria-hidden="true" className="h-4 w-4 text-warning-600" />;
}

export function EvidenceTimeline({
  timeline,
}: {
  timeline: { label: string; timestamp: string; status: EvidenceStatusValue }[];
}) {
  return (
    <ol className="space-y-0" aria-label="Evidence timeline">
      {timeline.map((step, index) => {
        const isLast = index === timeline.length - 1;
        return (
          <li key={index} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-neutral-200"
              />
            )}
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
              {timelineIcon(step.status)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-sm font-medium text-neutral-900">{step.label}</p>
                <time className="text-xs text-neutral-400" dateTime={step.timestamp}>
                  {formatDate(step.timestamp, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </time>
              </div>
              {step.status !== 'COMPLETED' && (
                <div className="mt-1">
                  <EvidenceStatus status={step.status} size="sm" />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function SecurityEventTimeline({ events }: { events: SecurityEvent[] }) {
  return (
    <Card title="Security events" bodyClassName="p-0">
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Timer aria-hidden="true" className="h-7 w-7 text-neutral-300" />
          <p className="text-sm text-neutral-500">No security events recorded.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-warning-600" />
                  <span className="truncate">{event.title}</span>
                </p>
                <p className="mt-1 text-sm text-neutral-500">{event.description}</p>
                <p className="mt-2 text-xs font-mono text-neutral-400">{event.id}</p>
              </div>
              <div className="shrink-0 text-right">
                <EvidenceStatus status={event.status} size="sm" />
                <p className="mt-1 text-xs text-neutral-400">
                  {formatDate(event.timestamp, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
