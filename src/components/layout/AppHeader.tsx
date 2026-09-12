import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { IS_MOCK } from '@/constants';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { sectionForPath } from '@/app/config/navigation';
import { roleLabel } from '@/features/holder-admin/services/holderAdminService';

interface AppHeaderProps {
  onMenuToggle: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const context = sectionForPath(location.pathname);
  const role = user?.role ?? 'PUBLIC';

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenuToggle}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 lg:hidden"
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1.5 md:flex">
        <span className="text-sm font-semibold text-neutral-900">
          SecureX
        </span>
        {context.section && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" aria-hidden="true" />
            <span className="truncate text-sm text-neutral-500">{context.section}</span>
          </>
        )}
        {context.label && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" aria-hidden="true" />
            <span className="truncate text-sm font-medium text-neutral-700">{context.label}</span>
          </>
        )}
      </nav>
      <div className="flex-1 md:hidden" />

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('securex:command-search'))}
        className="hidden h-10 w-64 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500 transition-colors hover:border-securex-300 hover:bg-white md:inline-flex lg:w-80"
        aria-label="Search SecureX"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-left">
          Search credentials, blocks, users…
        </span>
        <kbd className="flex shrink-0 items-center gap-0.5 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
          <span aria-hidden="true">⌘</span>K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('securex:command-search'))}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 md:hidden"
        aria-label="Search SecureX"
      >
        <Search className="h-5 w-5" />
      </button>

      <span
        className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline-flex ${
          IS_MOCK
            ? 'border-warning-200 bg-warning-50 text-warning-600'
            : 'border-trust-200 bg-trust-50 text-trust-600'
        }`}
        title={IS_MOCK ? 'Demo data is active' : 'Connected to live services'}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            IS_MOCK ? 'bg-warning-500' : 'bg-trust-500'
          }`}
          aria-hidden="true"
        />
        {IS_MOCK ? 'Demo' : 'Live'}
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setNotificationsOpen((v) => !v)}
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100"
          aria-label={`Notifications (${unreadCount} unread)`}
          aria-expanded={notificationsOpen}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <NotificationCenter
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      </div>

      <div className="relative" ref={userMenuRef}>
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-neutral-100"
          aria-label="Open user menu"
          aria-expanded={userMenuOpen}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-securex-500 to-securex-700 text-xs font-semibold text-white">
              {initials}
            </span>
          )}
          <span className="hidden text-left lg:block">
            <span className="block max-w-32 truncate text-sm font-semibold text-neutral-900">
              {user?.name ?? 'Guest'}
            </span>
            <span className="block text-xs text-neutral-500">{roleLabel(role)}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-neutral-400 lg:block" aria-hidden="true" />
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-securex border border-neutral-200 bg-white py-1.5 shadow-securex-lg animate-securex-fade-in">
            <div className="border-b border-neutral-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-neutral-900">{user?.name}</p>
              <p className="truncate text-xs text-neutral-500">{user?.email}</p>
              <span className="mt-1.5 inline-flex items-center rounded-full border border-securex-100 bg-securex-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-securex-700">
                {roleLabel(role)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/account/settings')}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => navigate('/account/settings')}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <UserIcon className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 transition-colors hover:bg-danger-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}