import { useEffect, useMemo, useState } from 'react';
import { KeyRound, RefreshCw, Search, ShieldBan, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  Input,
  ModeIndicator,
  Select,
  Table,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { getRealIssuers } from '@/features/holder-admin/services/holderAdminService';
import { issuerStatusBadgeVariant } from '@/constants/badges';
import type { Issuer } from '@/types';
import { formatDate, truncateHash } from '@/utils';

export default function AdminIssuersPage() {
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionTarget, setActionTarget] = useState<Issuer | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'restore' | null>(null);

  useEffect(() => {
    let active = true;
    getRealIssuers()
      .then((data) => active && setIssuers(data))
      .catch(() => active && setIssuers([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const institutionOptions = useMemo(() => {
    const institutions = Array.from(
      new Set(issuers.map((i) => i.institutionName)),
    ).sort();
    return [
      { label: 'All institutions', value: 'ALL' },
      ...institutions.map((name) => ({ label: name, value: name })),
    ];
  }, [issuers]);

  const statusOptions = useMemo(
    () => [
      { label: 'All statuses', value: 'ALL' },
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Suspended', value: 'SUSPENDED' },
      { label: 'Revoked', value: 'REVOKED' },
    ],
    [],
  );

  const counts = useMemo(() => {
    const filtered = issuers.filter((i) => {
      if (institutionFilter !== 'ALL' && i.institutionName !== institutionFilter) return false;
      return true;
    });
    return {
      ALL: filtered.length,
      ACTIVE: filtered.filter((i) => i.status === 'ACTIVE').length,
      SUSPENDED: filtered.filter((i) => i.status === 'SUSPENDED').length,
      REVOKED: filtered.filter((i) => i.status === 'REVOKED').length,
    };
  }, [issuers, institutionFilter]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issuers.filter((issuer) => {
      if (
        institutionFilter !== 'ALL' &&
        issuer.institutionName !== institutionFilter
      )
        return false;
      if (statusFilter !== 'ALL' && issuer.status !== statusFilter) return false;
      if (!query) return true;
      return (
        issuer.name.toLowerCase().includes(query) ||
        issuer.institutionName.toLowerCase().includes(query) ||
        issuer.email.toLowerCase().includes(query)
      );
    });
  }, [issuers, search, institutionFilter, statusFilter]);

  const totalCredentialsIssued = useMemo(
    () => visible.reduce((sum, i) => sum + i.credentialsIssued, 0),
    [visible],
  );

  const handleAction = (issuer: Issuer, type: 'suspend' | 'restore') => {
    setActionTarget(issuer);
    setActionType(type);
  };

  const confirmAction = () => {
    if (!actionTarget || !actionType) return;
    setIssuers((prev) =>
      prev.map((i) =>
        i.id === actionTarget.id
          ? { ...i, status: actionType === 'suspend' ? 'SUSPENDED' as const : 'ACTIVE' as const }
          : i,
      ),
    );
    setActionTarget(null);
    setActionType(null);
  };

  const columns: Column<Issuer>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Issuer',
        sortable: true,
        accessor: (row) => (
          <div>
            <p className="font-medium text-neutral-900">{row.name}</p>
            <p className="text-xs text-neutral-500">{row.email}</p>
          </div>
        ),
      },
      {
        key: 'institutionName',
        header: 'Institution',
        accessor: (row) => row.institutionName,
        sortable: true,
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (row) => (
          <Badge variant={issuerStatusBadgeVariant[row.status]}>{row.status}</Badge>
        ),
        sortable: true,
      },
      {
        key: 'credentialsIssued',
        header: 'Credentials Issued',
        accessor: (row) => row.credentialsIssued.toLocaleString(),
        align: 'right',
        sortable: true,
      },
      {
        key: 'publicKey',
        header: 'Public Key',
        accessor: (row) => (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-600">
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            {truncateHash(row.publicKey, 8, 8)}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Added',
        accessor: (row) => formatDate(row.createdAt),
        sortable: true,
        sortValue: (row) => row.createdAt,
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: (row) => (
          <div className="flex items-center gap-1">
            {row.status === 'ACTIVE' ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ShieldBan className="h-4 w-4" />}
                className="text-warning-600"
                onClick={(e) => { e.stopPropagation(); handleAction(row, 'suspend'); }}
              >
                Suspend
              </Button>
            ) : row.status === 'SUSPENDED' ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                className="text-trust-600"
                onClick={(e) => { e.stopPropagation(); handleAction(row, 'restore'); }}
              >
                Restore
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">All Issuers</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Review signing authorities across all institutions.{' '}
              <span className="font-medium text-neutral-700">{counts.ACTIVE} active</span>,{' '}
              <span className="font-medium text-neutral-700">{totalCredentialsIssued.toLocaleString()} total credentials issued</span>.
            </p>
          </div>
          <ModeIndicator />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search issuers\u2026"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="sm:flex-1"
        />
        <Select
          aria-label="Filter by institution"
          value={institutionFilter}
          onChange={(event) => setInstitutionFilter(event.target.value)}
          options={institutionOptions}
          className="sm:w-64"
        />
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={statusOptions}
          className="sm:w-44"
        />
      </div>

      <Table
        ariaLabel="Issuers"
        columns={columns}
        data={visible}
        rowKey={(row) => row.id}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        emptyState={
          <EmptyState
            compact
            icon={<Users className="h-6 w-6" />}
            title="No issuers found"
            description="Try adjusting your filters."
          />
        }
      />

      <Dialog
        open={actionType === 'suspend'}
        title="Suspend Issuer?"
        message={
          <>
            This will suspend <strong>{actionTarget?.name}</strong> and prevent them from
            issuing new credentials. Existing credentials remain valid until individually
            revoked.
          </>
        }
        variant="danger"
        confirmLabel="Suspend Issuer"
        onConfirm={confirmAction}
        onCancel={() => { setActionTarget(null); setActionType(null); }}
      />

      <Dialog
        open={actionType === 'restore'}
        title="Restore Issuer?"
        message={
          <>
            This will restore <strong>{actionTarget?.name}</strong> to active status,
            allowing them to issue credentials again.
          </>
        }
        variant="info"
        confirmLabel="Restore Issuer"
        onConfirm={confirmAction}
        onCancel={() => { setActionTarget(null); setActionType(null); }}
      />
    </div>
  );
}
