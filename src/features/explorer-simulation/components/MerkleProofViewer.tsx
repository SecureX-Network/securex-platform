import { ArrowDown, GitBranch, CheckCircle2, ShieldX } from 'lucide-react';
import { Card } from '@/components/ui';
import type { MerkleProof } from '../types';
import { EvidenceStatus } from './EvidenceStatus';
import { HashDisplay } from './HashDisplay';

export function MerkleProofViewer({ proof }: { proof: MerkleProof }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <GitBranch aria-hidden="true" className="h-4 w-4 text-securex-600" />
          Merkle proof path
        </div>
        <EvidenceStatus status={proof.verificationStatus} />
      </div>

      <div className="px-5 py-5">
        <ol className="space-y-0" aria-label="Merkle proof path">
          {proof.path.map((node, index) => {
            return (
              <li key={index} className="relative">
                <div className="flex items-start gap-3">
                  <span
                    className={classNamesForNode(node.position)}
                    aria-hidden="true"
                  >
                    {node.position === 'leaf' ? (
                      <ArrowDown className="h-3.5 w-3.5" />
                    ) : node.position === 'root' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <GitBranch className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {nodeLabel(node.position)}
                        {node.direction ? ` (${node.direction})` : ''}
                      </p>
                      {node.position === 'root' && (
                        <EvidenceStatus status={proof.verificationStatus} size="sm" />
                      )}
                    </div>
                    <div className="mt-1">
                      <HashDisplay value={node.hash} startChars={16} endChars={12} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex items-start gap-3 border-t border-neutral-100 bg-neutral-50/60 px-5 py-4">
        {proof.verificationStatus === 'VALID' ? (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-trust-600" />
        ) : (
          <ShieldX aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
        )}
        <p className="text-sm text-neutral-700">{proof.detail}</p>
      </div>
    </Card>
  );
}

function nodeLabel(position: MerkleProof['path'][number]['position']): string {
  switch (position) {
    case 'leaf':
      return 'Leaf';
    case 'sibling':
      return 'Sibling';
    case 'root':
      return 'Root';
    default:
      return 'Sibling';
  }
}

function classNamesForNode(position: MerkleProof['path'][number]['position']): string {
  const base =
    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full';
  if (position === 'leaf') return `${base} bg-securex-50 text-securex-600`;
  if (position === 'root') return `${base} bg-trust-50 text-trust-600`;
  return `${base} bg-neutral-100 text-neutral-500`;
}
