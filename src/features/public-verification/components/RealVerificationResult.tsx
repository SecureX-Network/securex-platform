import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileSearch,
  HelpCircle,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import type { VerificationView } from '@/features/holder-admin/services/holderAdminService';
import type { TamperCheckStatus } from '@/features/holder-admin/types/backend';
import { formatDate, truncateHash } from '@/utils';

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm text-neutral-800 ${
          mono ? 'font-mono text-xs text-neutral-600' : ''
        }`}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}

const tamperConfig: Record<
  TamperCheckStatus,
  { label: string; text: string; badge: 'success' | 'warning' | 'danger' }
> = {
  EXACT: { label: 'Document matches the ledger', text: 'text-trust-700', badge: 'success' },
  TAMPERED: { label: 'Document tampered', text: 'text-danger-700', badge: 'danger' },
  UNVERIFIABLE: { label: 'Document integrity unverifiable', text: 'text-neutral-600', badge: 'warning' },
};

function statusTone(status: VerificationView['status']): {
  title: string;
  icon: ReactNode;
  color: string;
} {
  switch (status) {
    case 'VALID':
      return {
        title: 'Credential verified',
        icon: <ShieldCheck className="h-8 w-8 text-trust-500" />,
        color: 'bg-trust-50 text-trust-700',
      };
    case 'REVOKED':
    case 'INVALID':
      return {
        title: 'Credential is not valid',
        icon: <ShieldAlert className="h-8 w-8 text-danger-500" />,
        color: 'bg-danger-50 text-danger-700',
      };
    case 'SUSPENDED':
      return {
        title: 'Credential suspended',
        icon: <AlertTriangle className="h-8 w-8 text-warning-500" />,
        color: 'bg-warning-50 text-warning-700',
      };
    case 'EXPIRED':
      return {
        title: 'Credential expired',
        icon: <HelpCircle className="h-8 w-8 text-neutral-400" />,
        color: 'bg-neutral-100 text-neutral-600',
      };
    case 'NOT_FOUND':
      return {
        title: 'Credential not found',
        icon: <HelpCircle className="h-8 w-8 text-neutral-400" />,
        color: 'bg-neutral-100 text-neutral-600',
      };
    case 'UNVERIFIABLE':
    default:
      return {
        title: 'Credential could not be verified',
        icon: <AlertTriangle className="h-8 w-8 text-warning-500" />,
        color: 'bg-warning-50 text-warning-700',
      };
  }
}

export function RealVerificationResult({ result }: { result: VerificationView }) {
  const tone = statusTone(result.status);

  return (
    <div className="space-y-5">
      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div aria-hidden="true">{tone.icon}</div>
            <div>
              <div className="text-lg font-semibold text-neutral-900">{tone.title}</div>
              <div className="mt-0.5 text-sm text-neutral-500">
                <span className="font-mono text-xs">{result.credentialId}</span>
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.color}`}>
                  {result.status}
                </span>
              </div>
            </div>
          </div>
          {result.verifiedAt && (
            <div className="shrink-0 text-left text-xs text-neutral-500 sm:text-right">
              <div>
                Verified{' '}
                <span className="font-medium text-neutral-700">
                  {formatDate(result.verifiedAt, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
        {result.message && (
          <p className="mt-3 text-sm text-neutral-600">{result.message}</p>
        )}
      </Card>

      {result.documentHashCheck ? (
        <Card title="Document integrity check" bodyClassName="pt-4">
          <div className="mb-4 flex items-center gap-2">
            <Badge
              variant={tamperConfig[result.documentHashCheck.status].badge}
              icon={
                result.documentHashCheck.status === 'TAMPERED' ? (
                  <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
                ) : result.documentHashCheck.status === 'EXACT' ? (
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
                )
              }
            >
              {tamperConfig[result.documentHashCheck.status].label}
            </Badge>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Detail
              label="Hash in document"
              value={truncateHash(result.documentHashCheck.suppliedHash, 14, 10)}
              mono
            />
            <Detail
              label="Hash on ledger"
              value={
                result.documentHashCheck.anchoredHash
                  ? truncateHash(result.documentHashCheck.anchoredHash, 14, 10)
                  : 'Unavailable'
              }
              mono
            />
            <Detail
              label="Match"
              value={result.documentHashCheck.hashMatch ? 'Yes' : 'No'}
            />
            <Detail
              label="Checked at"
              value={formatDate(result.documentHashCheck.verifiedAt)}
            />
          </dl>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-3">
            <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                On-ledger status verified
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                This result reflects the credential&apos;s authoritative state on the
                SecureX ledger. To additionally confirm the integrity of an actual
                document, collapse the document&apos;s hash (sha256) and run a tamper
                check.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Issuer & signature" bodyClassName="pt-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Issuer" value={result.issuer?.name} />
          <Detail label="Issuer ID" value={result.issuer?.issuerId} mono />
          <Detail
            label="Issuer public key"
            value={truncateHash(result.issuer?.publicKey, 16, 12)}
            mono
          />
          <Detail label="Issuer status" value={result.issuer?.status} />
          <Detail label="Issuer signature" value={result.issuerSignatureValid ? 'Valid' : 'Invalid'} />
          <Detail label="Issuer key status" value={result.keyStatus ?? '—'} />
        </dl>
      </Card>

      {result.securityChecks && Object.keys(result.securityChecks).length > 0 && (
        <Card title="Security checks" bodyClassName="pt-4">
          <ul className="space-y-2">
            {Object.entries(result.securityChecks).map(([key, pass]) => (
              <li key={key} className="flex items-center gap-2 text-sm text-neutral-700">
                {pass ? (
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-trust-500" />
                ) : (
                  <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-danger-500" />
                )}
                <span className="capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Blockchain proof" bodyClassName="pt-4">
        <div className="mb-4 flex items-center gap-2">
          <Badge
            variant={result.status === 'VALID' ? 'success' : result.status === 'REVOKED' || result.status === 'INVALID' || result.status === 'NOT_FOUND' ? 'danger' : 'warning'}
            icon={
              result.status === 'VALID' ? (
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
              )
            }
          >
            {result.status === 'VALID' ? 'Anchored to SecureX ledger' : 'Recorded on SecureX ledger'}
          </Badge>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Transaction" value={result.transaction?.id} mono />
          <Detail label="Transaction type" value={result.transaction?.type} />
          <Detail label="Block height" value={result.transaction?.blockHeight ?? result.block?.height} mono />
          <Detail label="Block hash" value={truncateHash(result.block?.hash ?? result.transaction?.blockHash, 14, 10)} mono />
          <Detail label="Proposer" value={result.block?.proposer} mono />
          <Detail
            label="Block timestamp"
            value={result.block?.timestamp ? formatDate(result.block.timestamp) : '—'}
          />
        </dl>
        <div className="mt-4 flex items-center gap-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-400">
          <Layers aria-hidden="true" className="h-3.5 w-3.5" />
          Hash: <span className="font-mono">{truncateHash(result.credentialHash, 14, 10)}</span>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-securex-600" />
        <div className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-800">Proof is reference-only.</span>{' '}
          Verification carries the credential identifier and ledger proof; it never sends
          or stores holder PII or document contents.
        </div>
      </div>
    </div>
  );
}

export default RealVerificationResult;
