import { useMemo, useState } from 'react';
import { KeyRound, RefreshCw, Search, ShieldBan, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Select,
  Table,
  EmptyState,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { MOCK_ISSUERS } from '@/services/mock';
import type { Issuer } from '@/types';
import { formatDate, truncateHash } from '@/utils';

const statusVariant: Record<Issuer['status'], 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  REVOKED: 'danger',
};

export default function AdminIssuersPage() {
  const [search, setSearch] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const institutionOptions = useMemo(() => {
    const institutions = Array.from(
      new Set(MOCK_ISSUERS.map((i) => i.institutionName)),
    ).sort();
    return [
      { label: 'All institutions', value: 'ALL' },
      ...institutions.map((name) => ({ label: name, value: name })),
    ];
  }, []);

  const statusOptions = useMemo(
    () => [
      { label: 'All statuses', value: 'ALL' },
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Suspended', value: 'SUSPENDED' },
      { label: 'Revoked', value: 'REVOKED' },
    ],
    [],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MOCK_ISSUERS.filter((issuer) => {
      if (
        institutionFilter !== 'ALL' &&
        issuer.institutionName !== institutionFilter
      )
        return false;
      if (statusFilter !== 'ALL' && issuer.status !== statusFilter) return false;
      if (!query) return true;
      return (
        issuer.name.toLowerCase().includes(query) ||
        issuer.institutionName.toLowerCase().includes(query)
      );
    });
  }, [search, institutionFilter, statusFilter]);

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
          <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
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
            <KeyRound className="h-3.5 w-3.5 text-neutral-400" />
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
              >
                Suspend
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                className="text-trust-600"
              >
                Restore
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold text-neutral-900">All Issuers</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Review signing authorities across all institutions.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search issuers…"
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
    </div>
  );
}