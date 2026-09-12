import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { roleLabel } from '@/features/holder-admin/services/holderAdminService';
import { formatDate } from '@/utils';

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account & Settings"
        subtitle="Your profile, role, and session information."
        context="System"
      />

      <Card className="max-w-2xl">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-securex-500 to-securex-700 text-lg font-bold text-white">
            {(user?.name ?? 'U')
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-neutral-900">{user?.name ?? 'Guest'}</p>
            <p className="truncate text-sm text-neutral-500">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-neutral-100 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Role
            </dt>
            <dd className="mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-securex-100 bg-securex-50 px-2.5 py-1 text-xs font-bold text-securex-700">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {roleLabel(user?.role ?? 'PUBLIC')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Member since
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-800">
              {user?.createdAt ? formatDate(user.createdAt) : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-6">
          <Button variant="danger" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}