import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Boxes, FlaskConical, ShieldCheck } from 'lucide-react';
import { Tabs } from '@/components/ui';
import { getDataSourceMode } from '../services/explorerService';

const explorerTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'validators', label: 'Validators' },
  { id: 'network', label: 'Network' },
];

function getActiveTab(pathname: string): string {
  if (pathname === '/explorer') return 'overview';
  if (pathname.startsWith('/explorer/blocks')) return 'blocks';
  if (pathname.startsWith('/explorer/transactions')) return 'transactions';
  if (pathname.startsWith('/explorer/validators')) return 'validators';
  if (pathname.startsWith('/explorer/network')) return 'network';
  return 'overview';
}

function isAttackSimulationRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/explorer/attack-simulation') ||
    pathname.startsWith('/explorer/security/evidence')
  );
}

export function ExplorerLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const attackSimActive = isAttackSimulationRoute(location.pathname);
  const mode = getDataSourceMode();

  function handleTabChange(tabId: string) {
    const routes: Record<string, string> = {
      overview: '/explorer',
      blocks: '/explorer/blocks',
      transactions: '/explorer/transactions',
      validators: '/explorer/validators',
      network: '/explorer/network',
    };
    navigate(routes[tabId] ?? '/explorer');
  }

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
          <Tabs
            tabs={explorerTabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            variant="pills"
            listClassName="overflow-x-auto"
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <FlaskConical aria-hidden="true" className="h-3.5 w-3.5" />
              Security
            </span>
            <Link
              to="/explorer/attack-simulation"
              aria-current={attackSimActive ? 'page' : undefined}
              className={
                attackSimActive
                  ? 'inline-flex items-center gap-1.5 rounded-lg bg-securex-50 px-3 py-1.5 text-sm font-medium text-securex-700 ring-1 ring-inset ring-securex-600/20'
                  : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
              }
            >
              <FlaskConical aria-hidden="true" className="h-4 w-4" />
              Attack Simulation
            </Link>
            {attackSimActive && (
              <span className="text-xs text-slate-400">
                Review controlled attack scenarios, results, and security evidence.
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-securex-600" />
            SecureX Trust Network
          </span>
          <span>
            {mode === 'DEMO'
              ? 'Blockchain data shown is demo data for illustration.'
              : 'Blockchain data is served live from the SecureX Blockchain V2 node.'}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default ExplorerLayout;