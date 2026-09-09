import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, Search } from 'lucide-react';
import {
  Badge,
  Input,
  Select,
  Pagination,
  Table,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDate } from '@/utils';
import { getSecurityEvents } from '../services/securityCenterService';
import type { SecurityActivityItem } from '../types/security';

const PAGE_SIZE = 10;

const actionLabels: Record<string, string> = {
  USER_LOGIN: 'User Login',
  USER_LOGIN_FAILED: 'Failed Login',
  USER_LOGOUT: 'User Logout',
  CREDENTIAL_ISSUED: 'Credential Issued',
  CREDENTIAL_VERIFIED: 'Credential Verified',
  CREDENTIAL_REVOKED: 'Credential Revoked',
  CREDENTIAL_SUSPENDED: 'Credential Suspended',
  TAMPER_DETECTED: 'Tamper Detected',
  FRAUD_DETECTED: 'Fraud Detected',
  SECURITY_ALERT_CREATED: 'Alert Created',
  SECURITY_ALERT_ACKNOWLEDGED: 'Alert Acknowledged',
  SECURITY_CONFIG_CHANGED: 'Config Changed',
  INSTITUTION_REGISTERED: 'Institution Registered',
  ISSUER_STATUS_CHANGED: 'Issuer Status Changed',
  BRUTE_FORCE_BLOCKED: 'Brute Force Blocked',
  UNAUTHORIZED_ACCESS_BLOCKED: 'Unauthorized Access',
  SESSION_EXPIRED: 'Session Expired',
  MFA_CHALLENGE: 'MFA Challenge',
  ROLE_CHANGED: 'Role Changed',
};

const severityVariant: Record<string, 'danger' | 'warning' | 'info'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'warning',
  LOW: 'info',
};

const actionSeverity: Record<string, SecurityActivityItem['severity']> = {
  USER_LOGIN_FAILED: 'HIGH',
  TAMPER_DETECTED: 'CRITICAL',
  FRAUD_DETECTED: 'HIGH',
  SECURITY_ALERT_CREATED: 'HIGH',
  BRUTE_FORCE_BLOCKED: 'HIGH',
  UNAUTHORIZED_ACCESS_BLOCKED: 'CRITICAL',
  CREDENTIAL_REVOKED: 'MEDIUM',
  CREDENTIAL_SUSPENDED: 'MEDIUM',
  SECURITY_CONFIG_CHANGED: 'MEDIUM',
  ISSUER_STATUS_CHANGED: 'MEDIUM',
  ROLE_CHANGED: 'MEDIUM',
  SESSION_EXPIRED: 'MEDIUM',
  MFA_CHALLENGE: 'MEDIUM',
};

export default function SecurityEventsPage() {
  const [events, setEvents] = useState<SecurityActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSecurityEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const actionOptions = useMemo(
    () => [
      { label: 'All actions', value: 'ALL' },
      ...Array.from(new Set(events.map((e) => e.action)))
        .sort()
        .map((action) => ({
          label: actionLabels[action] ?? action.replace(/_/g, ' '),
          value: action,
        })),
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

    return events
      .map((event) => ({
        ...event,
        computedSeverity: actionSeverity[event.action] ?? event.severity,
      }))
      .filter((event) => {
        if (actionFilter !== 'ALL' && event.action !== actionFilter) return false;
        if (severityFilter !== 'ALL' && event.computedSeverity !== severityFilter)
          return false;
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
  }, [events, search, actionFilter, severityFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const columns: Column<(typeof filtered)[number]>[] = useMemo(
    () => [
      {
        key: 'severity',
        header: 'Severity',
        accessor: (row) => (
          <Badge variant={severityVariant[row.computedSeverity] ?? 'info'}>
            {row.computedSeverity}
          </Badge>
        ),
        sortable: true,
        sortValue: (row) =>
          ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(row.computedSeverity),
      },
      {
        key: 'action',
        header: 'Action',
        accessor: (row) => (
          <div>
            <p className="font-medium text-neutral-900">
              {actionLabels[row.action] ?? row.action.replace(/_/g, ' ')}
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
          <Badge variant="info" size="sm">
            {row.actorRole.replace(/_/g, ' ')}
          </Badge>
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

  if (error) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-danger-600" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-danger-900">Unable to load events</h1>
            <p className="mt-2 text-sm text-danger-800">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Security Events</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Security activity timeline for monitoring and forensics.{' '}
            <span className="font-medium text-neutral-700">{filtered.length} events</span>
            {dateFilter !== 'ALL' && ` in the last ${dateFilter.replace('d', ' days')}`}.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search action, actor, target, IP\u2026"
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
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(event) => {
            setSeverityFilter(event.target.value);
            setPage(1);
          }}
          options={[
            { label: 'All severities', value: 'ALL' },
            { label: 'Critical', value: 'CRITICAL' },
            { label: 'High', value: 'HIGH' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'Low', value: 'LOW' },
          ]}
          className="sm:w-44"
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
        ariaLabel="Security events"
        columns={columns}
        data={pageItems}
        rowKey={(row) => row.id}
        defaultSortColumn="timestamp"
        defaultSortDirection="desc"
        dense
        emptyState={
          <EmptyState
            compact
            icon={<Activity className="h-6 w-6" />}
            title="No events found"
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
