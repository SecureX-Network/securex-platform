import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileCheck,
  Filter,
  Fingerprint,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Pagination,
  Select,
  Skeleton,
} from '@/components/ui';

import { useAuth } from '@/hooks/useAuth';
import { getCredentials } from '@/services/api/credentialService';
import { formatDate } from '@/utils/format';
import type { Credential } from '@/types';

const PAGE_SIZE = 8;

const statusVariant: Record<
  string,
  'success' | 'danger' | 'warning' | 'default'
> = {
  VALID: 'success',
  REVOKED: 'danger',
  SUSPENDED: 'warning',
  EXPIRED: 'default',
  TAMPERED: 'danger',
  SUSPICIOUS: 'warning',
  NOT_FOUND: 'default',
  INVALID: 'danger',
};

export default function InstitutionCredentialsPage() {
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? 'inst-stanford';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getCredentials();
      setCredentials(
        data.filter((c) => c.institutionId === institutionId),
      );
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return credentials.filter((c) => {
      const normalizedSearch = search.toLowerCase();

      const matchesSearch =
        search === '' ||
        c.title.toLowerCase().includes(normalizedSearch) ||
        c.credentialId.toLowerCase().includes(normalizedSearch) ||
        c.holderName.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'ALL' || c.status === statusFilter;

      const matchesType = typeFilter === 'ALL' || c.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [credentials, search, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const allTypes = useMemo(
    () => [...new Set(credentials.map((c) => c.type))].sort(),
    [credentials],
  );

  const allSelected =
    paginated.length > 0 &&
    paginated.every((c) => selected.has(c.id));

  const someSelected =
    paginated.some((c) => selected.has(c.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      paginated.forEach((c) => next.delete(c.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginated.forEach((c) => next.add(c.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setSelected(next);
  };

  return (
    <div className="min-h-full space-y-7 pb-10">
      {/* ================================================== */}
      {/* PAGE HEADER */}
      {/* ================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white px-6 py-7 shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-securex-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-indigo-100/30 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-securex-600 to-indigo-700 text-white shadow-lg shadow-securex-600/20">
              <FileCheck className="h-7 w-7" />
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full border border-securex-100 bg-securex-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-securex-700">
                  Credential Registry
                </span>

                <span className="hidden items-center gap-1 text-xs text-trust-600 sm:flex">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure records
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
                Managed Credentials
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                Search, review and manage credentials issued by your institution.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            className="rounded-xl border-neutral-200 bg-white shadow-sm transition-all hover:border-securex-200 hover:bg-securex-50/40"
          >
            Export
          </Button>
        </div>
      </section>

      {/* ================================================== */}
      {/* SUMMARY STRIP */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-securex-50 text-securex-600">
              <FileCheck className="h-4.5 w-4.5" />
            </span>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Total Records
              </p>
              <p className="mt-0.5 text-xl font-bold text-neutral-950">
                {loading ? '—' : credentials.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-50 text-trust-600">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Valid Credentials
              </p>
              <p className="mt-0.5 text-xl font-bold text-neutral-950">
                {loading
                  ? '—'
                  : credentials.filter((c) => c.status === 'VALID').length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Fingerprint className="h-4.5 w-4.5" />
            </span>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Showing
              </p>
              <p className="mt-0.5 text-xl font-bold text-neutral-950">
                {loading ? '—' : filtered.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MAIN REGISTRY */}
      {/* ================================================== */}
      <Card
        padding="none"
        className="overflow-hidden rounded-3xl border-neutral-200 shadow-sm"
      >
        {/* Filters */}
        <div className="border-b border-neutral-100 bg-neutral-50/50 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-sm ring-1 ring-neutral-200">
              <Filter className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-800">
                Search & Filters
              </p>
              <p className="text-[10px] text-neutral-400">
                Narrow down your credential records
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search by ID, title, or holder..."
                leftIcon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                size="sm"
                className="bg-white"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                options={[
                  { label: 'All Statuses', value: 'ALL' },
                  { label: 'Valid', value: 'VALID' },
                  { label: 'Revoked', value: 'REVOKED' },
                  { label: 'Suspended', value: 'SUSPENDED' },
                  { label: 'Expired', value: 'EXPIRED' },
                  { label: 'Tampered', value: 'TAMPERED' },
                  { label: 'Suspicious', value: 'SUSPICIOUS' },
                ]}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                size="sm"
                className="w-full bg-white sm:w-40"
              />

              <Select
                options={[
                  { label: 'All Types', value: 'ALL' },
                  ...allTypes.map((t) => ({
                    label: t,
                    value: t,
                  })),
                ]}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                size="sm"
                className="w-full bg-white sm:w-40"
              />
            </div>
          </div>
        </div>

        {/* Selected Actions */}
        {selected.size > 0 && (
          <div className="flex flex-col gap-3 border-b border-securex-100 bg-securex-50/50 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-securex-600 text-[10px] font-bold text-white">
                {selected.size}
              </span>

              <span className="text-sm font-semibold text-securex-800">
                credential{selected.size > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Revoke Selected
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState
              compact
              title="No credentials found"
              description="Try adjusting your filters or search term."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-white text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                  <th className="w-12 px-5 py-4">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      size="sm"
                    />
                  </th>

                  <th className="px-4 py-4">Credential ID</th>
                  <th className="px-4 py-4">Credential</th>
                  <th className="px-4 py-4">Holder</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Issued</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {paginated.map((cred) => (
                  <tr
                    key={cred.id}
                    className={`group transition-colors ${
                      selected.has(cred.id)
                        ? 'bg-securex-50/40'
                        : 'hover:bg-neutral-50/70'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <Checkbox
                        checked={selected.has(cred.id)}
                        onChange={() => toggleOne(cred.id)}
                        size="sm"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-neutral-100 px-2.5 py-1.5 font-mono text-[11px] font-medium text-neutral-600">
                        {cred.credentialId}
                      </span>
                    </td>

                    <td className="max-w-[230px] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-securex-50 text-securex-600 transition-colors group-hover:bg-securex-100">
                          <FileCheck className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-800">
                            {cred.title}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-neutral-400">
                            {cred.type}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                          {cred.holderName.charAt(0).toUpperCase()}
                        </div>

                        <span className="font-medium text-neutral-700">
                          {cred.holderName}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant={statusVariant[cred.status] ?? 'default'}
                        size="sm"
                        dot
                      >
                        {cred.status}
                      </Badge>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-xs text-neutral-500">
                      {formatDate(cred.issuedAt)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-semibold text-neutral-500 transition-colors hover:bg-securex-50 hover:text-securex-700"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-neutral-100 bg-neutral-50/30 px-4 py-3 sm:px-5">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            showing={{
              from: filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1,
              to: Math.min(safePage * PAGE_SIZE, filtered.length),
              total: filtered.length,
            }}
          />
        </div>
      </Card>

      {/* ================================================== */}
      {/* TRUST FOOTER */}
      {/* ================================================== */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-trust-50 text-trust-600">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-bold text-neutral-800">
              Secure credential management
            </p>
            <p className="text-[10px] text-neutral-400">
              Registry data is managed within the SecureX verification
              environment.
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-trust-600">
          <span className="h-1.5 w-1.5 rounded-full bg-trust-500" />
          Protected
        </span>
      </div>
    </div>
  );
}