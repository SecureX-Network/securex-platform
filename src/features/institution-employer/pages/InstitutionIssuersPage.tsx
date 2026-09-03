import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  KeyRound,
  Mail,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Select,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getIssuers } from '@/services/api/institutionService';
import { formatDate, truncateHash } from '@/utils/format';
import { getIssuerStatusBadgeVariant } from '@/utils/status';
import type { Issuer } from '@/types';

export default function InstitutionIssuersPage() {
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? 'inst-stanford';

  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [formErrors, setFormErrors] = useState({ name: '', email: '' });

  const loadIssuers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getIssuers(institutionId);
      setIssuers(data);
    } catch {
      setError(true);
      setIssuers([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadIssuers();
  }, [loadIssuers]);

  const filtered = useMemo(() => {
    return issuers.filter(
      (i) => statusFilter === 'ALL' || i.status === statusFilter,
    );
  }, [issuers, statusFilter]);

  const counts = useMemo(
    () => ({
      active: issuers.filter((i) => i.status === 'ACTIVE').length,
      total: issuers.length,
      credentials: issuers.reduce((sum, i) => sum + i.credentialsIssued, 0),
    }),
    [issuers],
  );

  const validateForm = () => {
    const errors = { name: '', email: '' };
    if (!form.name.trim()) {
      errors.name = 'Issuer name is required.';
    } else if (form.name.trim().length < 3) {
      errors.name = 'Issuer name must be at least 3 characters.';
    }
    if (!form.email.trim()) {
      errors.email = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    setFormErrors(errors);
    return !errors.name && !errors.email;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setAdding(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setShowAdd(false);
      setForm({ name: '', email: '' });
      setFormErrors({ name: '', email: '' });
      await loadIssuers();
    } finally {
      setAdding(false);
    }
  };

  const openAddModal = () => {
    setForm({ name: '', email: '' });
    setFormErrors({ name: '', email: '' });
    setShowAdd(true);
  };

  const stats = [
    {
      label: 'Total Issuers',
      value: counts.total,
      icon: Building2,
      color: 'bg-securex-50 text-securex-600',
    },
    {
      label: 'Active Issuers',
      value: counts.active,
      icon: ShieldCheck,
      color: 'bg-trust-50 text-trust-600',
    },
    {
      label: 'Credentials Issued',
      value: counts.credentials.toLocaleString(),
      icon: KeyRound,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Issuers</h1>
          <p className="text-sm text-neutral-500">
            Manage signing authorities and public keys for your institution.
          </p>
        </div>
        <ErrorState
          title="Failed to load issuers"
          description="There was a problem loading your issuers. Please try again."
          onRetry={loadIssuers}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Issuers</h1>
          <p className="text-sm text-neutral-500">
            Manage signing authorities and public keys for your institution.
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openAddModal}
        >
          Add Issuer
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {loading ? <Skeleton className="h-7 w-16" /> : stat.value}
                  </p>
                </div>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <span className="text-sm font-medium text-neutral-700">
              Issuer Directory
            </span>
          </div>
          <Select
            aria-label="Filter issuers by status"
            options={[
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Suspended', value: 'SUSPENDED' },
              { label: 'Revoked', value: 'REVOKED' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="sm"
            className="w-32"
          />
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon={<Building2 className="h-6 w-6" />}
            title="No issuers found"
            description="Add an issuer to start issuing verifiable credentials."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            {filtered.map((issuer) => (
              <Link
                key={issuer.id}
                to={`/institution/issuers/${issuer.id}`}
                className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-securex transition-all hover:border-securex-200 hover:bg-securex-50/30 hover:shadow-securex-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-securex-50 text-securex-600 transition-colors group-hover:bg-securex-100">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {issuer.name}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {issuer.email}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={getIssuerStatusBadgeVariant(issuer.status)}
                    size="sm"
                    dot
                  >
                    {issuer.status}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-xs">
                  <div>
                    <span className="text-neutral-500">Credentials Issued</span>
                    <p className="mt-0.5 font-semibold text-neutral-800">
                      {issuer.credentialsIssued}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Created</span>
                    <p className="mt-0.5 font-medium text-neutral-700">
                      {formatDate(issuer.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-neutral-50 px-3 py-2">
                  <KeyRound className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
                  <span className="font-mono text-[11px] text-neutral-500">
                    {truncateHash(issuer.publicKey, 14, 10)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Issuer"
        description="Register a new signing authority for your institution."
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              isLoading={adding}
              disabled={adding}
            >
              Add Issuer
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Issuer Name"
            placeholder="e.g. Stanford Office of the Registrar"
            leftIcon={<Building2 className="h-4 w-4" />}
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
            }}
            error={formErrors.name || undefined}
          />
          <Input
            label="Contact Email"
            type="email"
            placeholder="issuer@institution.edu"
            leftIcon={<Mail className="h-4 w-4" />}
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
            }}
            error={formErrors.email || undefined}
          />
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-xs text-neutral-500">
            A signing key pair will be generated for this issuer. The public key
            will be registered on the SecureX ledger.
          </div>
        </form>
      </Modal>
    </div>
  );
}
