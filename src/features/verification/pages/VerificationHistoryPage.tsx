import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Download, Filter, Search } from 'lucide-react';
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
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/format';
import { toCsv, downloadCsv, csvFilename } from '@/utils/csv';
import { getStatusBadgeVariant } from '@/utils/status';
import {
  getScopedVerificationHistory,
  type HistoryScope,
  type VerificationHistoryRow,
} from '@/features/verification/services/verificationHistoryService';
import type { UserRole } from '@/types';

const PAGE_SIZE = 10;

const methodVariant: Record<string, 'default' | 'info' | 'purple' | 'warning'> = {
  QR_CODE: 'info',
  MANUAL: 'default',
  API: 'purple',
  LINK: 'warning',
};

/**
 * The platform records a verification against a credential, so the history a
 * role sees is scoped by who owns that credential. Only EMPLOYER performs
 * verifications, so for every other role the question being answered is
 * "who has looked at my credentials?".
 */
const SCOPE_FOR_ROLE: Record<UserRole, HistoryScope> = {
  EMPLOYER: 'performer',
  HOLDER: 'holder',
  INSTITUTION: 'issuer',
  ISSUER: 'issuer',
  ADMIN: 'holder',
  SECURITY_ADMIN: 'holder',
  NETWORK_ADMIN: 'holder',
  AUDITOR: 'holder',
  PUBLIC: 'performer',
};

/** Plain-language framing for the table, per scope. */
const FRAMING: Record<HistoryScope, { subtitle: string; holderColumn: string }> = {
  performer: {
    subtitle: 'Every credential you have verified, and the result the platform returned.',
    holderColumn: 'Verified By',
  },
  holder: {
    subtitle: 'Who has verified your credentials, and when.',
    holderColumn: 'Holder',
  },
  issuer: {
    subtitle: 'How verifiers have seen the credentials your institution issued.',
    holderColumn: 'Holder',
  },
};

export default function VerificationHistoryPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'HOLDER';
  const userId = user?.id ?? '';
  const scope = SCOPE_FOR_ROLE[role];
  const framing = FRAMING[scope];

  const [rows, setRows] = useState<VerificationHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('verifiedAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRows(await getScopedVerificationHistory(scope, userId));
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, userId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        needle === '' ||
        row.credentialTitle.toLowerCase().includes(needle) ||
        row.credentialId.toLowerCase().includes(needle) ||
        (row.holderName ?? '').toLowerCase().includes(needle) ||
        (row.institutionName ?? '').toLowerCase().includes(needle);

      const matchesStatus = statusFilter === 'ALL' || row.result === statusFilter;

      const date = new Date(row.verifiedAt).getTime();
      const from = fromDate ? new Date(fromDate).getTime() : null;
      const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
      const matchesFrom = from === null || date >= from;
      const matchesTo = to === null || date <= to;

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [rows, search, statusFilter, fromDate, toDate]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      valid: rows.filter((r) => r.result === 'VALID').length,
      flagged: rows.filter(
        (r) =>
          r.result === 'SUSPICIOUS' ||
          r.result === 'SUSPENDED' ||
          r.result === 'REVOKED' ||
          r.result === 'TAMPERED',
      ).length,
    }),
    [rows],
  );

  const columns: Column<VerificationHistoryRow>[] = useMemo(
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
        key: scope === 'performer' ? 'verifiedBy' : 'holderName',
        header: framing.holderColumn,
        sortable: true,
        sortValue: (row) => (scope === 'performer' ? row.verifiedBy : row.holderName),
        accessor: (row) => {
          // A verification record does not carry holder identity, and public
          // verification never discloses it. Report that plainly rather than
          // inventing a name.
          const value = scope === 'performer' ? row.verifiedBy : row.holderName;
          return value ? (
            <span className="text-neutral-600">{value}</span>
          ) : (
            <span className="text-neutral-400 italic">Not disclosed</span>
          );
        },
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
          <Badge variant={getStatusBadgeVariant(row.result)} size="sm" dot>
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
          <Badge variant={methodVariant[row.method] ?? 'default'} size="sm">
            {row.method.replace(/_/g, ' ')}
          </Badge>
        ),
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-3',
      },
    ],
    [framing.holderColumn, scope],
  );

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortable || !sortKey) return filtered;
    const accessor =
      column.sortValue ??
      ((row: VerificationHistoryRow) => {
        const value = (row as unknown as Record<string, unknown>)[column.key];
        return typeof value === 'number' || typeof value === 'string' ? value : null;
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
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSortChange = useCallback((key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDir(direction);
    setCurrentPage(1);
  }, []);

  // Exports every filtered row, not just the visible page, so the CSV matches
  // the on-screen filters rather than silently truncating at PAGE_SIZE.
  const handleExport = useCallback(() => {
    const csv = toCsv<VerificationHistoryRow>(sorted, [
      { header: 'Credential ID', value: (r) => r.credentialId },
      { header: 'Credential', value: (r) => r.credentialTitle },
      { header: 'Holder', value: (r) => r.holderName ?? 'Not disclosed' },
      { header: 'Institution', value: (r) => r.institutionName ?? 'Not disclosed' },
      { header: 'Result', value: (r) => r.result },
      { header: 'Method', value: (r) => r.method },
      { header: 'Verified at', value: (r) => formatDate(r.verifiedAt) },
    ]);
    downloadCsv(csvFilename('verification-history'), csv);
  }, [sorted]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Verification History" subtitle={framing.subtitle} />
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
      <PageHeader title="Verification History" subtitle={framing.subtitle}>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={handleExport}
          disabled={sorted.length === 0}
        >
          Export
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { label: 'Total Verifications', value: summary.total },
            { label: 'Valid', value: summary.valid },
            { label: 'Flagged', value: summary.flagged },
          ] as const
        ).map((stat) => (
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
                { label: 'Expired', value: 'EXPIRED' },
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

          <div className="flex-1">
            <Input
              placeholder="Search by credential, holder, or institution…"
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              aria-label="Search verification history"
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
                description="Try adjusting your filters, or verify a credential to start building history."
                action={
                  <Link
                    to="/verify-credential"
                    className="text-sm font-semibold text-securex-600 hover:text-securex-700"
                  >
                    Verify a credential
                  </Link>
                }
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
