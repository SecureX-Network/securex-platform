import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ShieldCheck, X } from 'lucide-react';
import { navigationFor, type NavSection } from '@/app/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip } from '@/components/ui';

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onToggleCollapsed?: () => void;
}

function GroupSection({
  section,
  collapsed,
  compact,
}: {
  section: NavSection;
  collapsed: boolean;
  compact: boolean;
}) {
  return (
    <div className="mb-5 last:mb-0">
      {!collapsed && !compact && (
        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {section.label}
        </p>
      )}
      <nav aria-label={section.label} className="space-y-1">
        {section.items.map((item) => {
          const Icon = item.icon;
          const className = ({ isActive }: { isActive: boolean }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center px-2' : ''
            } ${
              isActive
                ? 'bg-securex-600 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`;

          // An item that leaves this app (the Control Center) is a real anchor,
          // not a router link. NavLink would try to resolve it as an in-app
          // path and fail.
          const link = item.external ? (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noreferrer"
              className={className({ isActive: false })}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
            </a>
          ) : (
            <NavLink key={item.path} to={item.path} end={item.end} className={className}>
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-warning-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
          return collapsed ? (
            <div key={item.path} className="relative inline-flex w-full justify-center">
              <Tooltip content={item.label} position="right">
                {link}
              </Tooltip>
            </div>
          ) : (
            <div key={item.path}>{link}</div>
          );
        })}
      </nav>
    </div>
  );
}

export function AppSidebar({ collapsed, mobileOpen, onClose, onToggleCollapsed }: AppSidebarProps) {
  const { user } = useAuth();
  const role = user?.role ?? 'HOLDER';
  const sections = navigationFor(role);

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
        aria-label="Application navigation"
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-neutral-800 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <NavLink to="/" className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-trust-500 to-securex-600 text-white shadow-lg shadow-securex-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            {!collapsed && (
              <span className="truncate text-base font-black tracking-tight text-white">
                Secure<span className="text-securex-400">X</span>
                <span className="ml-1.5 rounded border border-neutral-700 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  WebApp
                </span>
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

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <GroupSection
              key={section.id}
              section={section}
              collapsed={collapsed}
              compact={mobileOpen}
            />
          ))}
        </div>

        <div className="border-t border-neutral-800 p-3">
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white lg:flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronsLeft
                className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              {!collapsed && <span>Collapse</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}