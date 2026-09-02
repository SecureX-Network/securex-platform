import { NavLink, Outlet } from 'react-router-dom';
import { Bell, IdCard, Settings, Share2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const TABS = [
  { label: 'Credentials', to: '/holder/credentials', icon: IdCard },
  { label: 'Share', to: '/holder/share', icon: Share2 },
  { label: 'Notifications', to: '/holder/notifications', icon: Bell },
  { label: 'Settings', to: '/holder/settings', icon: Settings },
];

export function HolderLayout() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-securex-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-neutral-500">Welcome back</p>
              <p className="text-sm font-semibold text-neutral-900">
                {firstName}
              </p>
            </div>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-securex-600 text-xs font-semibold text-white">
            {initials}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/holder/credentials'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-securex-600'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}