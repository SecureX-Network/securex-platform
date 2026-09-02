import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Boxes, ShieldCheck } from 'lucide-react';
import { classNames } from '@/utils';

const navItems = [
  { label: 'Overview', to: '/explorer', end: true },
  { label: 'Blocks', to: '/explorer/blocks', end: false },
  { label: 'Transactions', to: '/explorer/transactions', end: false },
];

export function ExplorerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link to="/explorer" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-securex-600 text-white">
                <Boxes aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-base font-bold text-slate-900">
                  SecureX Explorer
                </span>
                <span className="text-xs text-slate-500">
                  Credential Trust Network
                </span>
              </span>
            </Link>
            <a
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-securex-600" />
              Back to SecureX
            </a>
          </div>
          <nav
            aria-label="Explorer"
            className="flex items-center gap-1 overflow-x-auto"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  classNames(
                    'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-securex-50 text-securex-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-securex-600" />
            SecureX Trust Network
          </span>
          <span>Blockchain data shown is demo data for illustration.</span>
        </div>
      </footer>
    </div>
  );
}

export default ExplorerLayout;