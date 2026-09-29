import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Search, ShieldCheck, Users } from 'lucide-react';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Select,
  Skeleton,
} from '@/components/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { getCredentials } from '@/services/api/credentialService';
import { formatDate } from '@/utils/format';
import { getStatusBadgeVariant } from '@/utils/status';
import type { Credential, CredentialStatus } from '@/types';

const PAGE_SIZE = 8;

/**
 * The people who hold a credential this institution issued.
 *
 * HONESTY: SecureX stores no institution-side directory of people. A holder is
 * derived from the credentials the institution issued, so this list is "the
 * holders on your credential registry", scoped to the signed-in institution.
 * The platform remains the sole authority for holder identity; nothing here
 * invents a profile.
 */
interface HolderRow {
  id: string;
  name: string;
  credentials: Credential[];
  validCount: number;
  latestIssuedAt: string;
}

function toHolderRows(credentials: Credential[]): HolderRow[] {
  const byHolder = new Map<string, HolderRow>();

  for (const credential of credentials) {
    const key = credential.holderId || credential.holderName;
    const existing = byHolder.get(key);
    if (existing) {
      existing.credentials.push(credential);
      if (credential.status === 'VALID') existing.validCount += 1;
      if (new Date(credential.issuedAt) > new Date(existing.latestIssuedAt)) {
        existing.latestIssuedAt = credential.issuedAt;
      }
      continue;
    }
    byHolder.set(key, {
      id: key,
      name: credential.holderName,
      credentials: [credential],
      validCount: credential.status === 'VALID' ? 1 : 0,
      latestIssuedAt: credential.issuedAt,
    });
  }

  return [...byHolder.values()].sort(
    (a, b) => new Date(b.latestIssuedAt).getTime() - new Date(a.latestIssuedAt).getTime(),
  );
}

export default function InstitutionHoldersPage() {
  const { user } = useAuth();
  const institutionId = user?.institutionId;

  const [holders, setHolders] = useState<HolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CredentialStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getCredentials();
      // An issuer acts for its institution, so both roles scope on the same id.
      const own = institutionId
        ? data.filter((c) => c.institutionId === institutionId)
        : data;
      setHolders(toHolderRows(own));
    } catch {
      setError(true);
      setHolders([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return holders.filter((holder) => {
      const matchesSearch = needle === '' || holder.name.toLowerCase().includes(needle);
      const matchesStatus =
        statusFilter === 'ALL' ||
        holder.credentials.some((c) => c.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [holders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Holders"
          subtitle="The people holding credentials issued by your institution."
        />
        <ErrorState
          title="Failed to load holders"
          description="There was a problem loading your holder records. Please try again."
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holders"
        subtitle="Everyone holding a credential your institution has issued."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { label: 'Holders', icon: Users, value: holders.length },
            {
              label: 'Credentials Issued',
              icon: FileCheck,
              value: holders.reduce((sum, h) => sum + h.credentials.length, 0),
            },
            {
              label: 'Valid Credentials',
              icon: ShieldCheck,
              value: holders.reduce((sum, h) => sum + h.validCount, 0),
            },
          ] as const
        ).map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} padding="md">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-securex-50 text-securex-600">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading ? <Skeleton className="h-7 w-14" /> : stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-neutral-100 bg-neutral-50/50 p-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search holders by name…"
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              aria-label="Search holders"
            />
          </div>
          <Select
            options={[
              { label: 'Any Status', value: 'ALL' },
              { label: 'Has Valid', value: 'VALID' },
              { label: 'Has Revoked', value: 'REVOKED' },
              { label: 'Has Suspended', value: 'SUSPENDED' },
              { label: 'Has Expired', value: 'EXPIRED' },
            ]}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | CredentialStatus);
              setCurrentPage(1);
            }}
            size="sm"
            className="w-full lg:w-44"
            aria-label="Filter holders by credential status"
          />
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState
            compact
            title="No holders found"
            description={
              holders.length === 0
                ? 'Issue a credential and the holder will appear here.'
                : 'Try adjusting your search or status filter.'
            }
            action={
              holders.length === 0 ? (
                <Link
                  to="/institution/issue"
                  className="text-sm font-semibold text-securex-600 hover:text-securex-700"
                >
                  Issue a credential
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {paginated.map((holder) => (
              <li key={holder.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500">
                      {holder.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-800">
                        {holder.name}
                      </p>
                      <p className="truncate text-xs text-neutral-400">
                        {holder.credentials.length} credential
                        {holder.credentials.length === 1 ? '' : 's'} · latest issued{' '}
                        {formatDate(holder.latestIssuedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-13 sm:pl-0">
                    {holder.credentials.slice(0, 3).map((credential) => (
                      <Badge
                        key={credential.id}
                        variant={getStatusBadgeVariant(credential.status)}
                        size="sm"
                        dot
                      >
                        {credential.title}
                      </Badge>
                    ))}
                    {holder.credentials.length > 3 && (
                      <span className="text-xs text-neutral-400">
                        +{holder.credentials.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && filtered.length > 0 && (
          <div className="border-t border-neutral-100 bg-neutral-50/30 px-4 py-3 sm:px-5">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showing={{
                from: (safePage - 1) * PAGE_SIZE + 1,
                to: Math.min(safePage * PAGE_SIZE, filtered.length),
                total: filtered.length,
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
