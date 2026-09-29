import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CreditCard,
  QrCode,
  Share2,
  Wallet,
} from 'lucide-react';
import {
  CredentialCard,
  EmptyState,
  Input,
  ModeIndicator,
  Skeleton,
} from '@/components/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { getHolderCredentialsView } from '@/features/holder-admin/services/holderAdminService';
import type { Credential } from '@/types';

export default function HolderWalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const holderId = user?.id ?? 'usr-holder-001';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolderCredentialsView(holderId);
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

  const visibleCredentials = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return credentials;
    return credentials.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.institutionName.toLowerCase().includes(query) ||
        c.credentialId.toLowerCase().includes(query),
    );
  }, [credentials, search]);

  const validCount = credentials.filter((c) => c.status === 'VALID').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        subtitle={`${validCount} of ${credentials.length} credentials valid in your digital wallet.`}
        context="Trust"
      >
        <ModeIndicator />
      </PageHeader>

      <Input
        type="search"
        placeholder="Search your wallet…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        leftIcon={<Wallet className="h-4 w-4" />}
        className="max-w-md"
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : visibleCredentials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white">
          <EmptyState
            icon={<CreditCard className="h-6 w-6" />}
            title={search ? 'Nothing in your wallet matches' : 'Your wallet is empty'}
            description={
              search
                ? 'Try a different title, issuer, or credential ID.'
                : 'When an institution issues a credential to you, it appears here as a verifiable digital credential.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCredentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              title={credential.title}
              credentialType={credential.type}
              issuer={credential.institutionName}
              status={credential.status}
              issuedAt={credential.issuedAt}
              expiresAt={credential.expiresAt}
              credentialId={credential.credentialId}
              onClick={() => navigate(`/credentials/${credential.id}`)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-securex-100 bg-securex-50/60 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900">Share or verify</p>
          <p className="mt-0.5 text-sm text-neutral-600">
            Share a credential with a verifier, or check its status on the
            network.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/share')}
            className="inline-flex items-center gap-2 rounded-lg bg-securex-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-securex-700"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
          <button
            type="button"
            onClick={() => navigate('/verify')}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            Verify
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}