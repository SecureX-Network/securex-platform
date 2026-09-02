import { useEffect, useMemo, useState } from 'react';
import { Eye, Search, ShieldBan, UserCircle2 } from 'lucide-react';
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
import { getAllUsers } from '@/services/api/adminService';
import { MOCK_INSTITUTIONS } from '@/services/mock';
import type { User, UserRole } from '@/types';
import { formatDate } from '@/utils';

const roleVariant: Record<UserRole, 'default' | 'success' | 'info' | 'purple' | 'warning' | 'danger'> = {
  PUBLIC: 'default',
  HOLDER: 'success',
  INSTITUTION: 'info',
  ISSUER: 'purple',
  EMPLOYER: 'warning',
  ADMIN: 'danger',
  SECURITY_ADMIN: 'danger',
  NETWORK_ADMIN: 'danger',
  AUDITOR: 'warning',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    let active = true;
    getAllUsers()
      .then((data) => active && setUsers(data))
      .catch(() => active && setUsers([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(users.map((u) => u.role))).sort();
    return [
      { label: 'All roles', value: 'ALL' },
      ...roles.map((role) => ({ label: role.replace(/_/g, ' '), value: role })),
    ];
  }, [users]);

  const counts = useMemo(() => ({
    ALL: users.length,
    HOLDER: users.filter((u) => u.role === 'HOLDER').length,
    INSTITUTION: users.filter((u) => u.role === 'INSTITUTION').length,
    EMPLOYER: users.filter((u) => u.role === 'EMPLOYER').length,
    ADMIN: users.filter((u) => u.role === 'ADMIN' || u.role === 'SECURITY_ADMIN' || u.role === 'NETWORK_ADMIN').length,
  }), [users]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (!query) return true;
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
  }, [users, search, roleFilter]);

  const institutionName = (id?: string) =>
    id ? MOCK_INSTITUTIONS.find((i) => i.id === id)?.name ?? '\u2014' : '\u2014';

  const columns: Column<User>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        accessor: (row) => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-securex-50 text-securex-600">
              <UserCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-neutral-900">{row.name}</p>
              <p className="text-xs text-neutral-500">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        accessor: (row) => (
          <Badge variant={roleVariant[row.role]}>
            {row.role.replace(/_/g, ' ')}
          </Badge>
        ),
        sortable: true,
      },
      {
        key: 'institutionId',
        header: 'Institution',
        accessor: (row) => (
          <span className="text-sm text-neutral-600">{institutionName(row.institutionId)}</span>
        ),
      },
      {
        key: 'lastLoginAt',
        header: 'Last Login',
        accessor: (row) => (
          <span className="text-sm text-neutral-500">
            {row.lastLoginAt ? formatDate(row.lastLoginAt) : '\u2014'}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.lastLoginAt ?? '',
      },
      {
        key: 'createdAt',
        header: 'Joined',
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
            {row.role !== 'ADMIN' && row.role !== 'SECURITY_ADMIN' && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ShieldBan className="h-4 w-4" />}
                className="text-danger-600"
              >
                Deactivate
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
        <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Directory of all platform users.{' '}
          <span className="font-medium text-neutral-700">{counts.HOLDER} holders</span>,{' '}
          <span className="font-medium text-neutral-700">{counts.INSTITUTION} institutions</span>,{' '}
          <span className="font-medium text-neutral-700">{counts.EMPLOYER} employers</span>.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search users\u2026"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="sm:flex-1"
        />
        <Select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          options={roleOptions}
          className="sm:w-48"
        />
      </div>

      <Table
        ariaLabel="Users"
        columns={columns}
        data={visible}
        rowKey={(row) => row.id}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        emptyState={
          <EmptyState
            compact
            icon={<UserCircle2 className="h-6 w-6" />}
            title="No users found"
            description="Try adjusting your search or filters."
          />
        }
      />
    </div>
  );
}
