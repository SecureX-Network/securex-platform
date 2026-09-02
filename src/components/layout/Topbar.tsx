import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MOCK_NOTIFICATIONS } from '@/services/mock';

interface TopbarProps {
  title: string;
  onMenuToggle: () => void;
}

function settingsPathFor(role?: string): string {
  switch (role) {
    case 'HOLDER':
      return '/holder/settings';
    case 'INSTITUTION':
      return '/institution/templates';
    case 'EMPLOYER':
      return '/employer/history';
    default:
      return '/admin/settings';
  }
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

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
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-neutral-900">
        {title}
      </h1>

      <div className="relative hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          placeholder="Search credentials, blocks, transactions…"
          className="h-10 w-64 rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm outline-none transition-colors focus:border-securex-400 focus:bg-white lg:w-80"
        />
      </div>

      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100"
          aria-label="Open user menu"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-securex-600 text-xs font-semibold text-white">
              {initials}
            </span>
          )}
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-neutral-900">
              {user?.name ?? 'Guest'}
            </span>
            <span className="block text-xs text-neutral-500">
              {user?.role ?? 'PUBLIC'}
            </span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-neutral-400 sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-securex border border-neutral-200 bg-white py-1.5 shadow-securex-lg">
            <div className="border-b border-neutral-100 px-4 py-2.5">
              <p className="text-sm font-semibold text-neutral-900">
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(settingsPathFor(user?.role))}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => navigate(settingsPathFor(user?.role))}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <UserIcon className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
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