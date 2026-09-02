import { useEffect, useMemo, useState } from 'react';
import { Download, ScrollText, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Pagination,
  Select,
  Table,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { getAuditEvents } from '@/services/api/adminService';
import type { AuditEvent } from '@/types';
import { formatDate } from '@/utils';

const PAGE_SIZE = 6;

export default function AdminSecurityAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    getAuditEvents()
      .then((data) => active && setEvents(data))
      .catch(() => active && setEvents([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const actionOptions = useMemo(
    () => [
      { label: 'All actions', value: 'ALL' },
      ...Array.from(new Set(events.map((e) => e.action)))
        .sort()
        .map((action) => ({ label: action.replace(/_/g, ' '), value: action })),
    ],
    [events],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    const dateCutoffs: Record<string, number> = {
      '7d': now - 7 * 86_400_000,
      '30d': now - 30 * 86_400_000,
      '90d': now - 90 * 86_400_000,
    };

    return events.filter((event) => {
      if (actionFilter !== 'ALL' && event.action !== actionFilter) return false;
      if (dateFilter !== 'ALL') {
        const cutoff = dateCutoffs[dateFilter];
        if (cutoff && new Date(event.timestamp).getTime() < cutoff) return false;
      }
      if (!query) return true;
      return (
        event.action.toLowerCase().includes(query) ||
        event.actor.toLowerCase().includes(query) ||
        event.target.toLowerCase().includes(query) ||
        event.ipAddress.toLowerCase().includes(query)
      );
    });
  }, [events, search, actionFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const columns: Column<AuditEvent>[] = useMemo(
    () => [
      {
        key: 'action',
        header: 'Action',
        accessor: (row) => (
          <div>
            <p className="font-medium text-neutral-900">
              {row.action.replace(/_/g, ' ')}
            </p>
            {row.details && (
              <p className="max-w-xs truncate text-xs text-neutral-500">
                {row.details}
              </p>
            )}
          </div>
        ),
        sortable: true,
      },
      {
        key: 'actor',
        header: 'Actor',
        accessor: (row) => <span className="font-medium">{row.actor}</span>,
        sortable: true,
      },
      {
        key: 'actorRole',
        header: 'Role',
        accessor: (row) => (
          <Badge variant="info">{row.actorRole.replace(/_/g, ' ')}</Badge>
        ),
      },
      { key: 'target', header: 'Target', accessor: (row) => row.target },
      { key: 'targetType', header: 'Type', accessor: (row) => row.targetType },
      {
        key: 'ipAddress',
        header: 'IP Address',
        accessor: (row) => (
          <span className="font-mono text-xs">{row.ipAddress}</span>
        ),
      },
      {
        key: 'timestamp',
        header: 'Timestamp',
        accessor: (row) => formatDate(row.timestamp, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        sortable: true,
        sortValue: (row) => row.timestamp,
      },
    ],
    [],
  );

  if (loading) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Audit Log</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Immutable trail of platform actions for compliance and forensics.
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => {}}
        >
          Export CSV
        </Button>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search action, actor, target, IP…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          leftIcon={<Search className="h-4 w-4" />}
          className="sm:flex-1"
        />
        <Select
          aria-label="Filter by action"
          value={actionFilter}
          onChange={(event) => {
            setActionFilter(event.target.value);
            setPage(1);
          }}
          options={actionOptions}
          className="sm:w-56"
        />
        <Select
          aria-label="Filter by date range"
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value);
            setPage(1);
          }}
          options={[
            { label: 'All time', value: 'ALL' },
            { label: 'Last 7 days', value: '7d' },
            { label: 'Last 30 days', value: '30d' },
            { label: 'Last 90 days', value: '90d' },
          ]}
          className="sm:w-44"
        />
      </div>

      <Table
        ariaLabel="Audit events"
        columns={columns}
        data={pageItems}
        rowKey={(row) => row.id}
        defaultSortColumn="timestamp"
        defaultSortDirection="desc"
        dense
        emptyState={
          <EmptyState
            compact
            icon={<ScrollText className="h-6 w-6" />}
            title="No audit events found"
            description="Try adjusting your filters."
          />
        }
      />

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        showing={{
          from: filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1,
          to: Math.min(safePage * PAGE_SIZE, filtered.length),
          total: filtered.length,
        }}
      />
    </div>
  );
}