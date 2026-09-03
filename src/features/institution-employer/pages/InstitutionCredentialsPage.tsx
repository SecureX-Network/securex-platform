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
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Select,
  Skeleton,
  Table,
} from '@/components/ui';
import type { Column, SortDirection } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getCredentials } from '@/services/api/credentialService';
import { formatDate } from '@/utils/format';
import { getStatusBadgeVariant } from '@/utils/status';
import type { Credential } from '@/types';

const PAGE_SIZE = 8;

export default function InstitutionCredentialsPage() {
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? 'inst-stanford';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('issuedAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getCredentials();
      setCredentials(data.filter((c) => c.institutionId === institutionId));
    } catch {
      setError(true);
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

  const allTypes = useMemo(
    () => [...new Set(credentials.map((c) => c.type))].sort(),
    [credentials],
  );

  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelected(next);
    },
    [selected],
  );

  const columns: Column<Credential>[] = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        width: 'w-10',
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
        accessor: (row) => (
          <Checkbox
            checked={selected.has(row.id)}
            onChange={() => toggleOne(row.id)}
            size="sm"
            aria-label={`Select credential ${row.title}`}
          />
        ),
      },
      {
        key: 'credentialId',
        header: 'Credential ID',
        sortable: true,
        headerClassName: 'px-4 py-3',
        className: 'whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-600',
      },
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        headerClassName: 'px-4 py-3',
        className: 'max-w-[200px] truncate px-4 py-3 font-medium text-neutral-800',
      },
      {
        key: 'holderName',
        header: 'Holder',
        sortable: true,
        accessor: (row) => row.holderName,
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3 text-neutral-600',
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (row) => row.status,
        accessor: (row) => (
          <Badge
            variant={getStatusBadgeVariant(row.status)}
            size="sm"
            dot
          >
            {row.status}
          </Badge>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
      {
        key: 'issuedAt',
        header: 'Issued',
        sortable: true,
        sortValue: (row) => row.issuedAt,
        accessor: (row) => (
          <span className="whitespace-nowrap text-neutral-500">
            {formatDate(row.issuedAt)}
          </span>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
      {
        key: 'actions',
        header: 'Actions',
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
        accessor: (row) => (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`View credential ${row.title}`}
          >
            View
          </Button>
        ),
      },
    ],
    [selected, toggleOne],
  );

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column || !column.sortable || !sortKey) return filtered;
    const accessor =
      column.sortValue ??
      ((row: Credential) => {
        const value = (row as unknown as Record<string, unknown>)[column.key];
        return typeof value === 'number' || typeof value === 'string'
          ? value
          : null;
      });
    return [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, columns, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleSortChange = useCallback(
    (key: string, direction: SortDirection) => {
      setSortKey(key);
      setSortDir(direction);
      setCurrentPage(1);
    },
    [],
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Managed Credentials
          </h1>
          <p className="text-sm text-neutral-500">
            All credentials issued by your institution.
          </p>
        </div>
        <ErrorState
          title="Failed to load credentials"
          description="There was a problem loading your credentials. Please try again."
          onRetry={loadData}
        />
      </div>
    );
  }

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
          disabled
          title="Export coming soon"
          aria-label="Export credentials (coming soon)"
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
              aria-label="Search credentials"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <Select
              aria-label="Filter by status"
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Valid', value: 'VALID' },
                { label: 'Revoked', value: 'REVOKED' },
                { label: 'Suspended', value: 'SUSPENDED' },
                { label: 'Expired', value: 'EXPIRED' },
                { label: 'Tampered', value: 'TAMPERED' },
                { label: 'Suspicious', value: 'SUSPICIOUS' },
                { label: 'Not Found', value: 'NOT_FOUND' },
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
              aria-label="Filter by type"
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
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setShowRevokeConfirm(true)}
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
        )}

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table
            ariaLabel="Managed credentials"
            columns={columns}
            data={paginated}
            rowKey={(row) => row.id}
            sortColumn={sortKey}
            sortDirection={sortDir}
            onSortChange={handleSortChange}
            emptyState={
              <EmptyState
                compact
                title="No credentials found"
                description="Try adjusting your filters or search term."
              />
            }
          />
        )}

        {!loading && totalPages > 1 && (
          <div className="border-t border-neutral-100 px-4 py-3">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showing={{
                from: (safePage - 1) * PAGE_SIZE + 1,
                to: Math.min(safePage * PAGE_SIZE, sorted.length),
                total: sorted.length,
              }}
            />
          </div>
        )}
      </Card>

      <Dialog
        open={showRevokeConfirm}
        title="Revoke credentials"
        message={`You selected ${selected.size} credential${selected.size > 1 ? 's' : ''} for revocation. Automatic revocation is not yet available — this action is being rolled out soon and won't modify any credentials yet.`}
        variant="info"
        confirmLabel="Got it"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowRevokeConfirm(false);
          setSelected(new Set());
        }}
        onCancel={() => setShowRevokeConfirm(false)}
      />
    </div>
  );
}
