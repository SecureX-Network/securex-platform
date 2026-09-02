import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Fingerprint,
  Layers,
  Link2,
  QrCode,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Spinner,
  StatusIndicator,
} from '@/components/ui';
import { getCredentialById } from '@/services/api/credentialService';
import type { Credential } from '@/types';
import { formatDate, truncateHash } from '@/utils';

const statusTone: Record<
  Credential['status'],
  { label: string; classes: string }
> = {
  VALID: { label: 'Valid', classes: 'bg-trust-50 text-trust-700' },
  INVALID: { label: 'Invalid', classes: 'bg-danger-50 text-danger-700' },
  REVOKED: { label: 'Revoked', classes: 'bg-danger-50 text-danger-700' },
  SUSPENDED: { label: 'Suspended', classes: 'bg-warning-50 text-warning-700' },
  EXPIRED: { label: 'Expired', classes: 'bg-neutral-100 text-neutral-600' },
  TAMPERED: { label: 'Tampered', classes: 'bg-danger-50 text-danger-700' },
  SUSPICIOUS: { label: 'Suspicious', classes: 'bg-warning-50 text-warning-700' },
  NOT_FOUND: { label: 'Not found', classes: 'bg-neutral-100 text-neutral-600' },
};

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd
        className={`break-all text-right text-sm font-medium text-neutral-800 ${className ?? ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default function HolderCredentialDetailPage() {
  const { credentialId = '' } = useParams<{ credentialId: string }>();
  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCredentialById(credentialId)
      .then((data) => {
        if (active) setCredential(data);
      })
      .catch(() => {
        if (active) setCredential(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [credentialId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" color="#7c3aed" label="Loading credential" />
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="space-y-4">
        <Link
          to="/holder/credentials"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to credentials
        </Link>
        <ErrorState
          title="Credential not found"
          description="We couldn’t find this credential in your wallet."
        />
      </div>
    );
  }

  const tone = statusTone[credential.status];

  const handleCopy = async () => {
    const link = `${window.location.origin}/verify/${credential.credentialId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to="/holder/credentials"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to credentials
      </Link>

      <section>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-securex-50 text-securex-600">
            <Award className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-neutral-900">
              {credential.title}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {credential.type} · {credential.institutionName}
            </p>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.classes}`}>
              {tone.label}
            </span>
          </div>
        </div>
      </section>

      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Credential Information
        </h2>
        <dl className="divide-y divide-neutral-100">
          <DetailRow label="Credential ID" value={credential.credentialId} className="font-mono text-xs" />
          <DetailRow label="Holder" value={credential.holderName} />
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm text-neutral-500">Status</dt>
            <dd>
              <StatusIndicator status={credential.status} />
            </dd>
          </div>
        </dl>
        {credential.description && (
          <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
            {credential.description}
          </p>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Issuer
          </h2>
        </div>
        <p className="text-base font-semibold text-neutral-900">{credential.issuerName}</p>
        <p className="text-sm text-neutral-500">{credential.institutionName}</p>
        <div className="mt-3">
          <Badge variant="success" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            Verified issuer
          </Badge>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Validity
          </h2>
        </div>
        <dl className="divide-y divide-neutral-100">
          <DetailRow label="Issued" value={formatDate(credential.issuedAt)} />
          <DetailRow
            label="Expires"
            value={credential.expiresAt ? formatDate(credential.expiresAt) : 'Never'}
          />
          {credential.revokedAt && (
            <>
              <DetailRow label="Revoked" value={formatDate(credential.revokedAt)} />
              <DetailRow label="Revocation reason" value={credential.revokedReason ?? '—'} />
            </>
          )}
        </dl>
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Layers className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Blockchain Proof
          </h2>
        </div>
        <dl className="divide-y divide-neutral-100">
          <DetailRow
            label="Transaction hash"
            value={truncateHash(credential.blockchainTxHash)}
            className="font-mono text-xs text-securex-600"
          />
          <DetailRow
            label="Merkle root"
            value={truncateHash(credential.merkleRoot)}
            className="font-mono text-xs"
          />
          <DetailRow label="Block" value="Recorded on-chain" />
        </dl>
        <div className="mt-3 flex items-center gap-1.5 text-sm text-trust-700">
          <CheckCircle2 className="h-4 w-4" />
          Proof anchored to SecureX ledger
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Digital Signature
          </h2>
        </div>
        <dl className="divide-y divide-neutral-100">
          <DetailRow
            label="Signature"
            value={truncateHash(credential.digitalSignature)}
            className="font-mono text-xs"
          />
          <DetailRow label="Algorithm" value="Ed25519-SHA256" />
        </dl>
        <div className="mt-3 flex items-center gap-1.5 text-sm text-trust-700">
          <ShieldCheck className="h-4 w-4" />
          Signature verified
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Share
          </h2>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-neutral-50 p-5">
          <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white">
            <span className="text-center">
              <QrCode className="mx-auto h-8 w-8 text-neutral-400" />
              <span className="mt-1 block font-mono text-[10px] text-neutral-400">
                {credential.credentialId}
              </span>
            </span>
          </div>
          <p className="text-center text-xs text-neutral-500">
            Scan to verify this credential securely.
          </p>
          <Button
            fullWidth
            leftIcon={<Share2 className="h-4 w-4" />}
            onClick={() => {
              void handleCopy();
            }}
          >
            Share this credential
          </Button>
          <Button
            fullWidth
            variant="outline"
            leftIcon={copied ? <CheckCircle2 className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            onClick={() => {
              void handleCopy();
            }}
          >
            {copied ? 'Link copied!' : 'Copy verify link'}
          </Button>
        </div>
      </Card>
    </div>
  );
}