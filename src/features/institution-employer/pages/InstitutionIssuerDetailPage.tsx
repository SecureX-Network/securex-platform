import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Building2,
  Calendar,
  FileCheck,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getIssuers } from '@/services/api/institutionService';
import { getCredentials } from '@/services/api/credentialService';
import { formatDate, truncateHash } from '@/utils/format';
import { getIssuerStatusBadgeVariant, getStatusBadgeVariant } from '@/utils/status';
import type { Credential, Issuer } from '@/types';

export default function InstitutionIssuerDetailPage() {
  const { issuerId = '' } = useParams<{ issuerId: string }>();
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? 'inst-stanford';

  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [issuers, creds] = await Promise.all([
        getIssuers(institutionId),
        getCredentials(),
      ]);
      const found = issuers.find((i) => i.id === issuerId);
      setIssuer(found ?? null);
      setCredentials(
        creds
          .filter((c) => c.issuerId === issuerId)
          .sort(
            (a, b) =>
              new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
          ),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [issuerId, institutionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(
    () => [
      {
        label: 'Credentials Issued',
        value: issuer?.credentialsIssued?.toLocaleString() ?? '—',
        icon: FileCheck,
        color: 'bg-securex-50 text-securex-600',
      },
      {
        label: 'Last Active',
        value:
          credentials.length > 0
            ? formatDate(credentials[0]!.issuedAt)
            : '—',
        icon: Calendar,
        color: 'bg-trust-50 text-trust-600',
      },
      {
        label: 'Status',
        value: issuer?.status ?? '—',
        icon: ShieldCheck,
        color:
          issuer?.status === 'ACTIVE'
            ? 'bg-trust-50 text-trust-600'
            : 'bg-warning-50 text-warning-600',
      },
    ],
    [issuer, credentials],
  );

  const toggleStatus = async () => {
    if (!issuer) return;
    setUpdating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setIssuer({
        ...issuer,
        status: issuer.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Issuers', href: '/institution/issuers' },
            { label: 'Issuer Details', active: true },
          ]}
        />
        <ErrorState
          title="Failed to load issuer"
          description="There was a problem loading the issuer details. Please try again."
          onRetry={loadData}
        />
      </div>
    );
  }

  if (!issuer) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Issuers', href: '/institution/issuers' },
            { label: 'Issuer Details', active: true },
          ]}
        />
        <Card>
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="Issuer not found"
            description="The issuer you are looking for does not exist."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Breadcrumb
            items={[
              { label: 'Issuers', href: '/institution/issuers' },
              { label: issuer.name, active: true },
            ]}
          />
          <div className="flex items-center gap-3">
            <Link
              to="/institution/issuers"
              aria-label="Back to issuers"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900">
              <ShieldCheck className="h-5 w-5 text-securex-600" />
              {issuer.name}
            </h1>
            <Badge variant={getIssuerStatusBadgeVariant(issuer.status)} dot>
              {issuer.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {issuer.status === 'ACTIVE' ? (
            <Button
              variant="danger"
              size="sm"
              isLoading={updating}
              leftIcon={<Ban className="h-4 w-4" />}
              onClick={toggleStatus}
              aria-label={`Suspend issuer ${issuer.name}`}
            >
              Suspend Issuer
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={updating}
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={toggleStatus}
              aria-label={`Reactivate issuer ${issuer.name}`}
            >
              Reactivate Issuer
            </Button>
          )}
        </div>
      </div>

      <Card title="Issuer Information" padding="lg">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-securex-600 text-white">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Institution
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {issuer.institutionName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Contact Email
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-800">
                <Mail className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                {issuer.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Registered
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {formatDate(issuer.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3">
          <KeyRound className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Public Key
          </span>
          <span className="font-mono text-xs text-neutral-700">
            {truncateHash(issuer.publicKey, 18, 12)}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} padding="md">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-neutral-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Recent Credentials" padding="none">
        {credentials.length === 0 ? (
          <EmptyState
            compact
            icon={<FileCheck className="h-6 w-6" />}
            title="No credentials issued"
            description="This issuer has not issued any credentials yet."
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {credentials.slice(0, 5).map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {cred.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {cred.credentialId} · {cred.holderName}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <Badge
                    variant={getStatusBadgeVariant(cred.status)}
                    size="sm"
                    dot
                  >
                    {cred.status}
                  </Badge>
                  <span className="whitespace-nowrap text-xs text-neutral-400">
                    {formatDate(cred.issuedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
