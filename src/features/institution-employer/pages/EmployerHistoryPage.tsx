import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  Filter,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
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
import { getVerificationHistory } from '@/services/api/verificationService';
import { formatDate } from '@/utils/format';
import { getStatusBadgeVariant } from '@/utils/status';
import type { VerificationHistory } from '@/types';

const PAGE_SIZE = 10;

const methodVariant: Record<string, 'default' | 'info' | 'purple' | 'warning'> = {
  QR_CODE: 'info',
  MANUAL: 'default',
  API: 'purple',
  LINK: 'warning',
};

export default function EmployerHistoryPage() {
  const { user } = useAuth();
  const employerId = user?.id ?? 'usr-employer-001';

  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('verifiedAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getVerificationHistory(employerId);
      setHistory(data);
    } catch {
      setError(true);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [employerId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filtered = useMemo(() => {
    return history.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.result === statusFilter;
      const date = new Date(item.verifiedAt).getTime();
      const from = fromDate ? new Date(fromDate).getTime() : null;
      const to = toDate ? new Date(toDate + 'T23:59:59').getTime() : null;
      const matchesFrom = from === null || date >= from;
      const matchesTo = to === null || date <= to;
      return matchesStatus && matchesFrom && matchesTo;
    });
  }, [history, statusFilter, fromDate, toDate]);

  const summary = useMemo(
    () => ({
      total: history.length,
      valid: history.filter((h) => h.result === 'VALID').length,
      flagged: history.filter(
        (h) =>
          h.result === 'SUSPICIOUS' ||
          h.result === 'SUSPENDED' ||
          h.result === 'REVOKED' ||
          h.result === 'TAMPERED',
      ).length,
    }),
    [history],
  );

  const summaryCards = [
    { label: 'Total Verifications', value: summary.total },
    { label: 'Valid', value: summary.valid },
    { label: 'Flagged', value: summary.flagged },
  ];

  const columns: Column<VerificationHistory>[] = useMemo(
    () => [
      {
        key: 'credentialTitle',
        header: 'Credential',
        sortable: true,
        sortValue: (row) => row.credentialTitle,
        accessor: (row) => (
          <div className="max-w-[220px]">
            <p className="truncate font-medium text-neutral-800">
              {row.credentialTitle}
            </p>
            <p className="font-mono text-[11px] text-neutral-400">
              {row.credentialId}
            </p>
          </div>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
      {
        key: 'verifiedBy',
        header: 'Holder',
        sortable: true,
        accessor: (row) => (
          <span className="text-neutral-600">{row.verifiedBy}</span>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
      {
        key: 'verifiedAt',
        header: 'Date',
        sortable: true,
        sortValue: (row) => row.verifiedAt,
        accessor: (row) => (
          <span className="whitespace-nowrap text-neutral-500">
            {formatDate(row.verifiedAt)}
          </span>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
      {
        key: 'result',
        header: 'Result',
        sortable: true,
        sortValue: (row) => row.result,
        accessor: (row) => (
          <Badge
            variant={getStatusBadgeVariant(row.result)}
            size="sm"
            dot
          >
            {row.result}
          </Badge>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
      {
        key: 'method',
        header: 'Method',
        sortable: true,
        accessor: (row) => (
          <Badge
            variant={methodVariant[row.method] ?? 'default'}
            size="sm"
          >
            {row.method.replace(/_/g, ' ')}
          </Badge>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
    ],
    [],
  );

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column || !column.sortable || !sortKey) return filtered;
    const accessor =
      column.sortValue ??
      ((row: VerificationHistory) => {
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
            Verification History
          </h1>
          <p className="text-sm text-neutral-500">
            A complete audit trail of every credential your organization has
            verified.
          </p>
        </div>
        <ErrorState
          title="Failed to load verification history"
          description="There was a problem loading your verification history. Please try again."
          onRetry={loadHistory}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Verification History
          </h1>
          <p className="text-sm text-neutral-500">
            A complete audit trail of every credential your organization has
            verified.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          disabled
          title="Export coming soon"
          aria-label="Export verification history (coming soon)"
        >
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((stat) => (
          <Card key={stat.label} padding="md">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {loading ? <Skeleton className="h-7 w-16" /> : stat.value}
            </p>
          </Card>
        ))}
      </div>

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <Select
              aria-label="Filter by result"
              options={[
                { label: 'All Results', value: 'ALL' },
                { label: 'Valid', value: 'VALID' },
                { label: 'Invalid', value: 'INVALID' },
                { label: 'Revoked', value: 'REVOKED' },
                { label: 'Suspended', value: 'SUSPENDED' },
                { label: 'Suspicious', value: 'SUSPICIOUS' },
                { label: 'Tampered', value: 'TAMPERED' },
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              className="w-40"
              aria-label="Filter from date"
            />
            <span className="text-xs text-neutral-400">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              className="w-40"
              aria-label="Filter to date"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table
            ariaLabel="Verification history"
            columns={columns}
            data={paginated}
            rowKey={(row) => row.id}
            sortColumn={sortKey}
            sortDirection={sortDir}
            onSortChange={handleSortChange}
            emptyState={
              <EmptyState
                compact
                title="No verifications found"
                description="Try adjusting your filters or date range."
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
    </div>
  );
}
