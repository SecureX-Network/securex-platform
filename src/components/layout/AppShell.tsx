import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { CommandPalette } from '@/features/search/components/CommandPalette';
import { NotificationsProvider } from '@/features/notifications/providers/NotificationsProvider';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    const onSearchEvent = () => setCommandOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('securex:command-search', onSearchEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('securex:command-search', onSearchEvent);
    };
  }, []);

  const handleMenuToggle = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-neutral-50">
        <AppSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
        <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          <AppHeader onMenuToggle={handleMenuToggle} />
          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      </div>
    </NotificationsProvider>
  );
}