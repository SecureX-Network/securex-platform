import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, IdCard, Search } from 'lucide-react';
import {
  CredentialCard,
  EmptyState,
  Input,
  Select,
  Spinner,
  Tabs,
} from '@/components/ui';
import type { TabItem } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getHolderCredentials } from '@/services/api/credentialService';
import type { Credential } from '@/types';

type StatusFilter = 'ALL' | 'VALID' | 'EXPIRED' | 'REVOKED';

const SORT_OPTIONS = [
  { label: 'Recently issued', value: 'recent' },
  { label: 'Expiring soon', value: 'expiry' },
  { label: 'Title (A–Z)', value: 'title' },
];

function applyStatusFilter(credential: Credential, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  return credential.status === filter;
}

export default function HolderCredentialsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const holderId = user?.id ?? 'usr-holder-001';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolderCredentials(holderId);
      setCredentials(data);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [holderId]);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  const counts = useMemo(
    () => ({
      ALL: credentials.length,
      VALID: credentials.filter((c) => c.status === 'VALID').length,
      EXPIRED: credentials.filter((c) => c.status === 'EXPIRED').length,
      REVOKED: credentials.filter((c) => c.status === 'REVOKED').length,
    }),
    [credentials],
  );

  const tabs: TabItem[] = useMemo(
    () => [
      { id: 'ALL', label: `All (${counts.ALL})` },
      { id: 'VALID', label: `Valid (${counts.VALID})` },
      { id: 'EXPIRED', label: `Expired (${counts.EXPIRED})` },
      { id: 'REVOKED', label: `Revoked (${counts.REVOKED})` },
    ],
    [counts],
  );

  const visibleCredentials = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = credentials.filter((credential) => {
      if (!applyStatusFilter(credential, statusFilter)) return false;
      if (!query) return true;
      return (
        credential.title.toLowerCase().includes(query) ||
        credential.institutionName.toLowerCase().includes(query) ||
        credential.credentialId.toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sort === 'expiry') {
        const aTime = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const bTime = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        if (aTime === bTime) return 0;
        if (aTime === Infinity) return 1;
        if (bTime === Infinity) return -1;
        return aTime - bTime;
      }
      return (
        new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      );
    });
  }, [credentials, search, sort, statusFilter]);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-xl font-bold text-neutral-900">My Credentials</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Every credential in your wallet, ready to view, verify, and share.
        </p>
      </section>

      <div className="space-y-3">
        <Input
          type="search"
          placeholder="Search by name, issuer, or ID…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <div className="flex items-center gap-2">
          <Select
            aria-label="Sort credentials"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            options={SORT_OPTIONS}
            className="flex-1"
          />
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort
          </span>
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={statusFilter}
        onChange={(id) => setStatusFilter(id as StatusFilter)}
        variant="pills"
        listClassName="overflow-x-auto pb-1"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" color="#7c3aed" label="Loading credentials" />
        </div>
      ) : visibleCredentials.length === 0 ? (
        <EmptyState
          icon={
            <div className="flex h-7 w-7 items-center justify-center">
              <IdCard className="h-6 w-6" />
            </div>
          }
          title={
            search || statusFilter !== 'ALL'
              ? 'No matching credentials'
              : 'No credentials yet'
          }
          description={
            search || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filters to find what you’re looking for.'
              : 'Credentials issued to you will appear here automatically.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleCredentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              title={credential.title}
              credentialType={credential.type}
              issuer={credential.institutionName}
              issuerVerified
              status={credential.status}
              issuedAt={credential.issuedAt}
              expiresAt={credential.expiresAt}
              credentialId={credential.credentialId}
              onClick={() => navigate(`/holder/credentials/${credential.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}