import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileSearch,
  Fingerprint,
  GitBranch,
  ShieldCheck,
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
  Skeleton,
} from '@/components/ui';
import { formatDate } from '@/utils';
import type { AttackEvidence, SecurityEvent } from '../types';
import {
  getSecurityEvent,
  getSecurityEvidence,
  getSimulationResult,
} from '../services/attackSimulationService';
import { evidenceLines } from '../data/evidence';
import { ExplorerLayout } from '../components/ExplorerLayout';
import { EvidenceCard } from '../components/EvidenceCard';
import { EvidenceStatus } from '../components/EvidenceStatus';
import { EvidenceTimeline } from '../components/SecurityEventTimeline';
import { MerkleProofViewer } from '../components/MerkleProofViewer';
import { HashDisplay } from '../components/HashDisplay';
import { InfoRow } from '../components/InfoRow';

export default function SecurityEvidencePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [evidence, setEvidence] = useState<AttackEvidence | null>(null);
  const [event, setEvent] = useState<SecurityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await getSimulationResult(id);
        const evidenceData = await getSecurityEvidence(id);
        const eventData = result?.relatedEventId
          ? await getSecurityEvent(result.relatedEventId)
          : null;
        if (!active) return;
        setEvidence(evidenceData);
        setEvent(eventData);
        setLoadError(null);
      } catch (e) {
        if (active) {
          setLoadError(e instanceof Error ? e.message : 'Unable to load evidence.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <ExplorerLayout>
      <div className="space-y-6">
        <Breadcrumb
          ariaLabel="Security evidence breadcrumb"
          items={[
            { label: 'Explorer', href: '/explorer' },
            {
              label: 'Attack Simulation',
              href: '/explorer/attack-simulation',
            },
            { label: 'Security Evidence', active: true },
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
        </div>

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-neutral-900">
            <FileSearch aria-hidden="true" className="h-6 w-6 text-securex-600" />
            Security Evidence
          </h1>
          <p className="mt-1 font-mono text-xs text-neutral-400">{id}</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : loadError ? (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-danger-600">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Card>
        ) : !evidence ? (
          <EmptyState
            icon={<UserX aria-hidden="true" className="h-7 w-7" />}
            title="Evidence not found"
            description={`No security evidence exists for simulation "${id}".`}
            actionButton={{
              label: 'Back to attack simulation',
              onClick: () => navigate('/explorer/attack-simulation'),
            }}
          />
        ) : (
          <>
            <Alert
              variant="info"
              title="Demo evidence"
              action={<Badge variant="info">Demo</Badge>}
            >
              The hashes, signatures and Merkle values below are generated locally
              for this demonstration. They illustrate how SecureX reports
              validation results; they are not produced by the real blockchain.
            </Alert>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Overview" bodyClassName="p-0">
                <dl className="divide-y divide-neutral-100 px-5">
                  <InfoRow
                    label="Overall result"
                    value={<EvidenceStatus status={evidence.evaluationStatus} />}
                  />
                  <InfoRow label="Simulation ID" value={<span className="font-mono text-xs">{evidence.simulationId}</span>} />
                  <InfoRow label="Block height" value={evidence.blockHeight} />
                </dl>
                <p className="px-5 pb-5 pt-2 text-sm text-neutral-500">{evidence.summary}</p>
              </Card>

              <Card title="Signature validation" bodyClassName="p-0">
                <dl className="divide-y divide-neutral-100 px-5">
                  <InfoRow
                    label="Status"
                    value={<EvidenceStatus status={evidence.signature.status} />}
                  />
                  <InfoRow
                    label="Reason"
                    value={<span className="text-neutral-700">{evidence.signature.reason}</span>}
                  />
                  {evidence.signature.signer && (
                    <InfoRow label="Signer" value={<span className="font-mono text-xs">{evidence.signature.signer}</span>} />
                  )}
                </dl>
                {evidence.signature.simulatedSignatureId && (
                  <p className="flex items-center gap-2 px-5 pb-5 pt-2 text-xs text-neutral-400">
                    <Fingerprint aria-hidden="true" className="h-3.5 w-3.5" />
                    Simulated signature identifier
                    <HashDisplay
                      value={evidence.signature.simulatedSignatureId}
                      startChars={12}
                      endChars={8}
                    />
                  </p>
                )}
              </Card>

              <Card title="Integrity" bodyClassName="p-0">
                <dl className="divide-y divide-neutral-100 px-5">
                  <InfoRow
                    label="Status"
                    value={<EvidenceStatus status={evidence.integrity.status} />}
                  />
                  <InfoRow
                    label="Reason"
                    value={<span className="text-neutral-700">{evidence.integrity.reason}</span>}
                  />
                  <InfoRow
                    label="Merkle root"
                    value={
                      <HashDisplay
                        value={evidence.integrity.merkleRoot}
                        startChars={12}
                        endChars={8}
                      />
                    }
                  />
                </dl>
              </Card>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <ShieldCheck aria-hidden="true" className="h-5 w-5 text-securex-600" />
                Evidence
              </h2>
              <div className="space-y-3">
                {evidenceLines(evidence).map((line) => (
                  <EvidenceCard key={line.id} line={line} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <GitBranch aria-hidden="true" className="h-5 w-5 text-securex-600" />
                Merkle proof
              </h2>
              <MerkleProofViewer proof={evidence.merkleProof} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Evidence timeline" bodyClassName="p-0">
                <div className="px-5 py-5">
                  <EvidenceTimeline timeline={evidence.timeline} />
                </div>
              </Card>

              <Card title="Security event" bodyClassName="p-0">
                {!event ? (
                  <p className="px-5 py-8 text-sm text-neutral-500">No security event recorded for this simulation.</p>
                ) : (
                  <dl className="divide-y divide-neutral-100">
                    <InfoRow label="Event ID" value={<span className="font-mono text-xs">{event.id}</span>} />
                    <InfoRow
                      label="Title"
                      value={<span className="flex items-center gap-2">{event.title}</span>}
                    />
                    <InfoRow
                      label="Status"
                      value={<EvidenceStatus status={event.status} />}
                    />
                    <InfoRow
                      label="Source"
                      value={<span className="font-mono text-xs">{event.source}</span>}
                    />
                    <InfoRow label="Target" value={event.target} />
                    <InfoRow
                      label="Recorded"
                      value={formatDate(event.timestamp)}
                    />
                  </dl>
                )}
              </Card>
            </div>

            <Card title="Evidence identifier" bodyClassName="p-0">
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <span className="flex items-center gap-2 text-sm text-neutral-500">
                  <ShieldX aria-hidden="true" className="h-4 w-4 text-neutral-400" />
                  Evidence reference
                </span>
                <HashDisplay value={evidence.id} startChars={16} endChars={12} />
              </div>
            </Card>

            <p className="text-xs text-neutral-400">
              Security evidence shown is demo data for illustration.
            </p>
          </>
        )}
      </div>
    </ExplorerLayout>
  );
}
