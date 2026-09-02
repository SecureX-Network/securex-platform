import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldX } from 'lucide-react';
import type { EvidenceLine } from '../types';
import { EvidenceStatus } from './EvidenceStatus';
import { HashDisplay } from './HashDisplay';

export function EvidenceCard({ line }: { line: EvidenceLine }) {
  const isHash = line.type === 'HASH' || line.type === 'BLOCK' || line.type === 'MERKLE';
  const isRejection = line.status === 'REJECTED' || line.status === 'INVALID';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-securex sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-900">{line.label}</p>
          <EvidenceStatus status={line.status} size="sm" />
        </div>
        {isHash ? (
          <div className="mt-1.5">
            <HashDisplay value={line.value} startChars={16} endChars={12} />
          </div>
        ) : (
          <p className="mt-1 text-sm font-medium text-neutral-700">{line.value}</p>
        )}
        {line.detail && (
          <p className="mt-1 text-sm text-neutral-500">{line.detail}</p>
        )}
      </div>
      {line.action === 'block' && line.link && (
        <Link
          to={line.link}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-securex-700 transition-colors hover:bg-securex-50"
        >
          View block
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
      {isRejection && (
        <span className="hidden shrink-0 text-danger-600 sm:block" aria-hidden="true">
          <ShieldX className="h-5 w-5" />
        </span>
      )}
      {!isRejection && line.status === 'VALID' && (
        <span className="hidden shrink-0 text-trust-600 sm:block" aria-hidden="true">
          <CheckCircle2 className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}
