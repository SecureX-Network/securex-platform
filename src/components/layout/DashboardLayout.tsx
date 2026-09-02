import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, type NavItem } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

interface DashboardLayoutProps {
  navigation: NavItem[];
  title: string;
}

export function DashboardLayout({ navigation, title }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuToggle = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar
        items={navigation}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
      />
      <div
        className={`transition-all duration-300 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Topbar title={title} onMenuToggle={handleMenuToggle} />
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}