import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ShieldCheck, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles?: UserRole[];
  end?: boolean;
  badge?: string;
}

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onClose: () => void;
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({
  items,
  collapsed,
  onClose,
  mobileOpen = false,
  onToggleCollapsed,
}: SidebarProps) {
  const { user } = useAuth();
  const role = user?.role ?? 'PUBLIC';
  const visibleItems = items.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-neutral-900 text-neutral-100 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div
          className={`flex h-16 items-center border-b border-neutral-800 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <NavLink to="/" className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-securex-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            {!collapsed && (
              <span className="truncate text-lg font-bold text-white">
                Secure<span className="text-securex-400">X</span>
              </span>
            )}
          </NavLink>
          {!collapsed && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-securex-600 text-white'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="rounded-full bg-warning-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 p-3">
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white lg:flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronsLeft
                className={`h-5 w-5 transition-transform ${
                  collapsed ? 'rotate-180' : ''
                }`}
              />
              {!collapsed && <span>Collapse</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}