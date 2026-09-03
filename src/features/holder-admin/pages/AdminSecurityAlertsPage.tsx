import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Select,
  Table,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { getSecurityAlerts } from '@/services/api/adminService';
import { severityBadgeVariant, alertStatusBadgeVariant } from '@/constants/badges';
import type { SecurityAlert } from '@/types';
import { formatDate, classNames } from '@/utils';

export default function AdminSecurityAlertsPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSecurityAlerts()
      .then((data) => active && setAlerts(data))
      .catch(() => active && setAlerts([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => {
    const active = alerts.filter(
      (a) => !['RESOLVED', 'DISMISSED'].includes(a.status),
    ).length;
    return {
      ALL: alerts.length,
      active,
      NEW: alerts.filter((a) => a.status === 'NEW').length,
      INVESTIGATING: alerts.filter((a) => a.status === 'INVESTIGATING').length,
    };
  }, [alerts]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (severityFilter !== 'ALL' && alert.severity !== severityFilter)
        return false;
      if (statusFilter !== 'ALL' && alert.status !== statusFilter) return false;
      if (!query) return true;
      return (
        alert.title.toLowerCase().includes(query) ||
        alert.source.toLowerCase().includes(query) ||
        alert.type.toLowerCase().includes(query)
      );
    });
  }, [alerts, search, severityFilter, statusFilter]);

  const updateAlertStatus = (id: string, status: SecurityAlert['status']) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  };

  const columns: Column<SecurityAlert>[] = useMemo(
    () => [
      {
        key: 'severity',
        header: 'Severity',
        accessor: (row) => (
          <Badge variant={severityBadgeVariant[row.severity]}>{row.severity}</Badge>
        ),
        sortable: true,
        sortValue: (row) =>
          ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(row.severity),
      },
      {
        key: 'type',
        header: 'Type',
        accessor: (row) => (
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {row.type.replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        key: 'title',
        header: 'Title',
        accessor: (row) => (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning-500" />
            <span className="font-medium text-neutral-900">{row.title}</span>
          </div>
        ),
      },
      { key: 'source', header: 'Source', accessor: (row) => row.source },
      {
        key: 'status',
        header: 'Status',
        accessor: (row) => (
          <Badge variant={alertStatusBadgeVariant[row.status]}>{row.status}</Badge>
        ),
        sortable: true,
      },
      {
        key: 'createdAt',
        header: 'Date',
        accessor: (row) => formatDate(row.createdAt),
        sortable: true,
        sortValue: (row) => row.createdAt,
      },
      {
        key: 'expand',
        header: '',
        align: 'right',
        accessor: (row) => (
          <ChevronDown
            className={classNames(
              'h-4 w-4 text-neutral-400 transition-transform',
              expandedId === row.id && 'rotate-180',
            )}
          />
        ),
      },
    ],
    [expandedId],
  );

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  if (loading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  const expandedAlert = alerts.find((a) => a.id === expandedId);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold text-neutral-900">Security Alerts</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Triage security alerts from tamper attempts to brute-force attacks.{' '}
          <span className="font-medium text-neutral-700">{counts.active} active</span>,{' '}
          <span className="font-medium text-neutral-700">{counts.NEW} new</span>.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search alerts\u2026"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="sm:flex-1"
        />
        <Select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value)}
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
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { label: 'All statuses', value: 'ALL' },
            { label: 'New', value: 'NEW' },
            { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
            { label: 'Investigating', value: 'INVESTIGATING' },
            { label: 'Resolved', value: 'RESOLVED' },
            { label: 'Dismissed', value: 'DISMISSED' },
          ]}
          className="sm:w-44"
        />
      </div>

      <Table
        ariaLabel="Security alerts"
        columns={columns}
        data={visible}
        rowKey={(row) => row.id}
        defaultSortColumn="createdAt"
        defaultSortDirection="desc"
        onRowClick={(row) => toggleExpand(row.id)}
        emptyState={
          <EmptyState
            compact
            icon={<ShieldAlert className="h-6 w-6" />}
            title="No alerts found"
            description="Try adjusting your filters."
          />
        }
      />

      {expandedAlert && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-securex">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              {expandedAlert.title}
            </h2>
            <Badge variant={severityBadgeVariant[expandedAlert.severity]}>
              {expandedAlert.severity}
            </Badge>
          </div>
          <div className="mb-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <p className="text-neutral-500">
              Type:{' '}
              <span className="font-medium text-neutral-800">
                {expandedAlert.type.replace(/_/g, ' ')}
              </span>
            </p>
            <p className="text-neutral-500">
              Source:{' '}
              <span className="font-medium text-neutral-800">
                {expandedAlert.source}
              </span>
            </p>
            <p className="text-neutral-500">
              Status:{' '}
              <Badge variant={alertStatusBadgeVariant[expandedAlert.status]}>
                {expandedAlert.status}
              </Badge>
            </p>
            <p className="text-neutral-500">
              Detected:{' '}
              <span className="font-medium text-neutral-800">
                {formatDate(expandedAlert.createdAt)}
              </span>
            </p>
          </div>
          <p className="rounded-lg bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
            {expandedAlert.description}
          </p>
          <div className="mt-4 flex gap-2">
            {expandedAlert.status !== 'ACKNOWLEDGED' && expandedAlert.status !== 'INVESTIGATING' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateAlertStatus(expandedAlert.id, 'ACKNOWLEDGED')}
              >
                Acknowledge
              </Button>
            )}
            {expandedAlert.status !== 'INVESTIGATING' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateAlertStatus(expandedAlert.id, 'INVESTIGATING')}
              >
                Investigate
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
