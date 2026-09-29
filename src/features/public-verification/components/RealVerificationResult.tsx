import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  FileSearch,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import type {
  DocumentIntegrityStatus,
  VerificationCheckView,
  VerificationStatus,
  VerificationView,
} from '@/features/holder-admin/services/holderAdminService';
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
        {value ?? '\u2014'}
      </dd>
    </div>
  );
}

const integrityConfig: Record<
  DocumentIntegrityStatus,
  { label: string; badge: 'success' | 'danger' | 'warning' }
> = {
  EXACT: { label: 'Document matches the platform record', badge: 'success' },
  TAMPERED: { label: 'Document does not match the platform record', badge: 'danger' },
  UNVERIFIABLE: { label: 'Document integrity not comparable', badge: 'warning' },
};

function statusTone(status: VerificationStatus): {
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
    case 'TAMPERED':
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
    case 'SUSPICIOUS':
      return {
        title: 'Credential flagged as suspicious',
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
    default:
      return {
        title: 'Credential could not be verified',
        icon: <AlertTriangle className="h-8 w-8 text-warning-500" />,
        color: 'bg-warning-50 text-warning-700',
      };
  }
}

/**
 * A check is only ever presented as passed when it actually ran and passed.
 * `available: false` means SecureX does not implement the check at all, so it is
 * labelled as not performed rather than as a failure or a pass.
 */
function checkPresentation(check: VerificationCheckView): {
  label: string;
  badge: 'success' | 'danger' | 'warning' | 'default';
  icon: ReactNode;
} {
  if (check.status === 'NOT_FOUND') {
    return {
      label: 'No record',
      badge: 'danger',
      icon: <CircleSlash aria-hidden="true" className="h-3.5 w-3.5" />,
    };
  }
  if (check.verified) {
    return {
      label: 'Checked',
      badge: 'success',
      icon: <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />,
    };
  }
  if (!check.available) {
    return {
      label: 'Not performed',
      badge: 'default',
      icon: <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />,
    };
  }
  return {
    label: 'Not verified',
    badge: 'warning',
    icon: <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />,
  };
}

function CheckRow({
  title,
  check,
}: {
  title: string;
  check: VerificationCheckView;
}) {
  const presentation = checkPresentation(check);
  return (
    <li className="border-b border-neutral-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-neutral-900">{title}</span>
        <Badge variant={presentation.badge} icon={presentation.icon}>
          {presentation.label}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-neutral-500">{check.detail}</p>
    </li>
  );
}

export function RealVerificationResult({ result }: { result: VerificationView }) {
  const tone = statusTone(result.status);
  const integrity = result.documentIntegrity;
  const statusDerivedFromExpiry =
    result.storedStatus !== result.status && result.status === 'EXPIRED';

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
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.color}`}
                >
                  {result.status}
                </span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-left text-xs text-neutral-500 sm:text-right">
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
        {result.message && (
          <p className="mt-3 text-sm text-neutral-600">{result.message}</p>
        )}
      </Card>

      <Card title="Credential record" bodyClassName="pt-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Issuing organisation" value={result.issuerName ?? 'Unknown'} />
          <Detail label="Recorded status" value={result.storedStatus} />
          <Detail
            label="Issued"
            value={result.issuedAt ? formatDate(result.issuedAt) : 'Unknown'}
          />
          <Detail
            label="Expires"
            value={result.expiresAt ? formatDate(result.expiresAt) : 'No expiry recorded'}
          />
          <Detail
            label="Revoked"
            value={result.revokedAt ? formatDate(result.revokedAt) : 'Not revoked'}
          />
          {statusDerivedFromExpiry && (
            <Detail
              label="Effective status"
              value="EXPIRED (derived from the expiration date on the record)"
            />
          )}
        </dl>
      </Card>

      <Card
        title="What was checked"
        description="Only the checks listed here were actually performed for this credential."
        bodyClassName="pt-4"
      >
        <ul>
          <CheckRow title="Credential record" check={result.checks.credentialRecord} />
          <CheckRow title="Blockchain proof" check={result.checks.blockchainProof} />
          <CheckRow title="Digital signature" check={result.checks.signature} />
        </ul>
      </Card>

      {integrity ? (
        <Card title="Document integrity check" bodyClassName="pt-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge
              variant={integrityConfig[integrity.status].badge}
              icon={
                integrity.status === 'TAMPERED' ? (
                  <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
                ) : integrity.status === 'EXACT' ? (
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
                )
              }
            >
              {integrityConfig[integrity.status].label}
            </Badge>
            <span className="text-xs text-neutral-400">Scope: platform record</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Detail
              label="Hash in document"
              value={truncateHash(integrity.suppliedHash, 14, 10)}
              mono
            />
            <Detail
              label="Matches platform record"
              value={integrity.hashMatch ? 'Yes' : 'No'}
            />
            <Detail label="Checked at" value={formatDate(integrity.verifiedAt)} />
          </dl>
          <p className="mt-3 text-sm text-neutral-500">{integrity.detail}</p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-3">
            <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                No document hash was supplied
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                This result confirms the status held on the SecureX Platform record only.
                To additionally check a document you hold, supply its hash (sha256) below;
                the comparison is made against the hash reference stored on the platform
                record and is not a blockchain or signature proof.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-securex-600" />
        <div className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-800">Verification is reference-only.</span>{' '}
          Verification carries the credential identifier only; it never sends or stores
          holder personal data or document contents.
        </div>
      </div>
    </div>
  );
}

export default RealVerificationResult;
