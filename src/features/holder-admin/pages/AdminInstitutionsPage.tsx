import { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, PauseCircle, PlayCircle, Search } from 'lucide-react';
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
import { getAllInstitutions } from '@/services/api/adminService';
import type { Institution } from '@/types';
import { formatDate } from '@/utils';

const statusVariant: Record<Institution['status'], 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  PENDING: 'warning',
};

export default function AdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let active = true;
    getAllInstitutions()
      .then((data) => active && setInstitutions(data))
      .catch(() => active && setInstitutions([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      ALL: institutions.length,
      ACTIVE: institutions.filter((i) => i.status === 'ACTIVE').length,
      SUSPENDED: institutions.filter((i) => i.status === 'SUSPENDED').length,
      PENDING: institutions.filter((i) => i.status === 'PENDING').length,
    }),
    [institutions],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return institutions.filter((institution) => {
      if (statusFilter !== 'ALL' && institution.status !== statusFilter)
        return false;
      if (!query) return true;
      return (
        institution.name.toLowerCase().includes(query) ||
        institution.type.toLowerCase().includes(query)
      );
    });
  }, [institutions, search, statusFilter]);

  const columns: Column<Institution>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        accessor: (row) => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-neutral-900">{row.name}</p>
              <p className="text-xs text-neutral-500">{row.type}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (row) => (
          <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
        ),
      },
      {
        key: 'credentialCount',
        header: 'Credentials',
        accessor: (row) => row.credentialCount.toLocaleString(),
        align: 'right',
        sortable: true,
      },
      {
        key: 'issuerCount',
        header: 'Issuers',
        accessor: (row) => row.issuerCount,
        align: 'right',
        sortable: true,
      },
      {
        key: 'verified',
        header: 'Verified',
        accessor: (row) => (
          <Badge variant={row.verified ? 'success' : 'warning'}>
            {row.verified ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'Date Added',
        accessor: (row) => formatDate(row.createdAt),
        sortable: true,
        sortValue: (row) => row.createdAt,
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: (row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Eye className="h-4 w-4" />}
            >
              View
            </Button>
            {row.status === 'ACTIVE' ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<PauseCircle className="h-4 w-4" />}
                className="text-warning-600"
              >
                Suspend
              </Button>
            ) : row.status === 'PENDING' ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<PlayCircle className="h-4 w-4" />}
                className="text-trust-600"
              >
                Approve
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<PlayCircle className="h-4 w-4" />}
                className="text-trust-600"
              >
                Activate
              </Button>
            )}
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
        <h1 className="text-2xl font-bold text-neutral-900">Institutions</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Onboard and manage institutions across the network.{' '}
          <span className="font-medium text-neutral-700">{counts.ACTIVE} active</span>,{' '}
          <span className="font-medium text-neutral-700">{counts.PENDING} pending</span>,{' '}
          <span className="font-medium text-neutral-700">{counts.SUSPENDED} suspended</span>.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search institutions\u2026"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="sm:max-w-xs sm:flex-1"
        />
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { label: 'All statuses', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Suspended', value: 'SUSPENDED' },
            { label: 'Pending', value: 'PENDING' },
          ]}
          className="sm:w-48"
        />
      </div>

      <Table
        ariaLabel="Institutions"
        columns={columns}
        data={visible}
        rowKey={(row) => row.id}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        emptyState={
          <EmptyState
            compact
            icon={<Building2 className="h-6 w-6" />}
            title="No institutions found"
            description="Try adjusting your search or filters."
          />
        }
      />
    </div>
  );
}
