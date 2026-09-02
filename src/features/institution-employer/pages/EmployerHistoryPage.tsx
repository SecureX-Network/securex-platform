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
  Input,
  Pagination,
  Select,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getVerificationHistory } from '@/services/api/verificationService';
import { formatDate } from '@/utils/format';
import type { VerificationHistory } from '@/types';

const PAGE_SIZE = 10;

const statusVariant: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  VALID: 'success',
  REVOKED: 'danger',
  TAMPERED: 'danger',
  SUSPENDED: 'warning',
  SUSPICIOUS: 'warning',
  INVALID: 'danger',
  NOT_FOUND: 'default',
};

export default function EmployerHistoryPage() {
  const { user } = useAuth();
  const employerId = user?.id ?? 'usr-employer-001';

  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVerificationHistory(employerId);
      setHistory(data);
    } catch {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

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
            <Filter className="h-4 w-4 text-neutral-400" />
            <Select
              options={[
                { label: 'All Results', value: 'ALL' },
                { label: 'Valid', value: 'VALID' },
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
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              className="w-40"
              aria-label="From date"
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
              aria-label="To date"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState
            compact
            title="No verifications found"
            description="Try adjusting your filters or date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/70 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Credential</th>
                  <th className="px-4 py-3">Holder</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginated.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-neutral-50/60"
                  >
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate font-medium text-neutral-800">
                        {item.credentialTitle}
                      </p>
                      <p className="font-mono text-[11px] text-neutral-400">
                        {item.credentialId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {item.verifiedBy}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                      {formatDate(item.verifiedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={statusVariant[item.result] ?? 'default'}
                        size="sm"
                        dot
                      >
                        {item.result}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                        {item.method}
                      </span>
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