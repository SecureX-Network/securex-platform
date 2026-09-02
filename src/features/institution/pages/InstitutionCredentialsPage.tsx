import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Filter,
  Search,
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

const statusVariant: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
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
      setCredentials(data.filter((c) => c.institutionId === institutionId));
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
      const matchesSearch =
        search === '' ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.credentialId.toLowerCase().includes(search.toLowerCase()) ||
        c.holderName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [credentials, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
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
    paginated.length > 0 && paginated.every((c) => selected.has(c.id));
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
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Managed Credentials
          </h1>
          <p className="text-sm text-neutral-500">
            All credentials issued by your institution.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
        >
          Export
        </Button>
      </div>

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center">
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
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
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
              className="w-36"
            />
            <Select
              options={[
                { label: 'All Types', value: 'ALL' },
                ...allTypes.map((t) => ({ label: t, value: t })),
              ]}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              className="w-36"
            />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-neutral-100 bg-securex-50/50 px-4 py-2.5">
            <span className="text-sm font-medium text-securex-700">
              {selected.size} selected
            </span>
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
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
        )}

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState
            compact
            title="No credentials found"
            description="Try adjusting your filters or search term."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/70 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      size="sm"
                    />
                  </th>
                  <th className="px-4 py-3">Credential ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Holder</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginated.map((cred) => (
                  <tr
                    key={cred.id}
                    className={`transition-colors hover:bg-neutral-50/60 ${selected.has(cred.id) ? 'bg-securex-50/30' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(cred.id)}
                        onChange={() => toggleOne(cred.id)}
                        size="sm"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-600">
                      {cred.credentialId}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-neutral-800">
                      {cred.title}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {cred.holderName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={statusVariant[cred.status] ?? 'default'}
                        size="sm"
                        dot
                      >
                        {cred.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                      {formatDate(cred.issuedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-neutral-100 px-4 py-3">
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
      </Card>
    </div>
  );
}
