import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExplorerChainProvider } from '../providers/ExplorerChainProvider';
import OverviewPage from '../pages/OverviewPage';
import BlocksPage from '../pages/BlocksPage';
import ValidatorsPage from '../pages/ValidatorsPage';
import TransactionsPage from '../pages/TransactionsPage';
import BlockDetailPage from '../pages/BlockDetailPage';

/**
 * The Explorer's three honesty guarantees, asserted at the screen level against
 * the chain as it actually exists: height 0, one genesis block, one validator,
 * zero transactions.
 *
 * A block explorer is a promise to show what is really on the chain. The most
 * damaging way for this app to fail is not a crash — it is a plausible-looking
 * page. So these tests pin the three cases that matter for a genesis chain:
 * a real zero is shown as a real zero, an empty list is shown as an empty list,
 * and a failed read is shown as a failure with nothing invented to fill the gap.
 */

// The repository's test config sets `VITE_USE_MOCK: 'true'` for the app's own
// demo-mode tests. The Explorer deliberately refuses to run in that mode, so
// the config is forced to REAL here at the module-graph level — before the
// page modules are imported — rather than via `stubEnv`, which would run after
// static imports have already captured the demo value.
vi.mock('@/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config')>();
  return { ...actual, config: { ...actual.config, IS_MOCK: false, API_URL: 'https://api-securex.sp-net.in/api' } };
});

const GENESIS_HASH = '046ceea3024f4b82b5fcc73998105be92252a06e8cbeda0e5728609ca0ae2a87';
const NODE_ID = '260391c6e9d757227edff5e28f39c87beef9fcd7f74b69f92d5af2308700163c';

type Json = Record<string, unknown>;

const GENESIS_BLOCK: Json = {
  hash: GENESIS_HASH,
  height: 0,
  previousHash: '0'.repeat(64),
  merkleRoot: '0'.repeat(64),
  timestamp: '2026-01-01T00:00:00.000Z',
  proposerId: '',
  version: 1,
  transactionCount: 0,
  transactions: [],
};

function ok(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  } as unknown as Response;
}

function routeApi(url: string): Response {
  const path = url.replace(/^https?:\/\/[^/]+\/api/, '');
  switch (path.split('?')[0]) {
    case '/blockchain/health':
      return ok({
        status: 'UP',
        height: 0,
        peerCount: 0,
        nodeVersion: '3.0.0',
        protocolVersion: '2.0',
        checkedAt: '2026-09-29T15:58:15.063Z',
      });
    case '/blockchain/state':
      return ok({ height: 0, issuers: 0, credentials: 0, validators: 1, keys: 0 });
    case '/blockchain/network':
      return ok({
        height: 0,
        peerCount: 0,
        validatorCount: 1,
        currentProposer: '',
        pendingTransactions: 0,
        nodeId: NODE_ID,
        status: 'RUNNING',
        connectedPeers: [],
        knownPeers: [],
      });
    case '/blockchain/metrics':
      return ok({
        height: 0,
        blockCount: 1,
        transactionCount: 0,
        validatorCount: 1,
        activeValidatorCount: 1,
        consensusStatus: 'RUNNING',
        currentProposer: '',
        nodeVersion: '3.0.0',
        protocolVersion: '2.0',
        uptimeSeconds: 1329,
      });
    case '/blockchain/validators':
      return ok([
        {
          id: NODE_ID,
          publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA\n-----END PUBLIC KEY-----\n',
          status: 'ACTIVE',
          active: true,
          addedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    case '/blockchain/blocks':
      return ok({ blocks: [GENESIS_BLOCK], offset: 0, limit: 25 });
    case '/blockchain/blocks/0':
      return ok(GENESIS_BLOCK);
    default:
      return {
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'not found' }),
      } as unknown as Response;
  }
}

function renderPage(ui: React.ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ExplorerChainProvider>{ui}</ExplorerChainProvider>
    </MemoryRouter>,
  );
}

function renderRoute(element: React.ReactElement, path: string, route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ExplorerChainProvider>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </ExplorerChainProvider>
    </MemoryRouter>,
  );
}

/**
 * The whole stat card containing a given label, so value and label are scoped
 * together. `selector` disambiguates labels that also appear elsewhere on the
 * page (e.g. "Validators" is both a stat and a chain-state counter).
 */
function statByLabel(label: string, selector = 'p, dt, span'): HTMLElement {
  return screen.getByText(label, { selector }).parentElement as HTMLElement;
}

describe('explorer pages on the real (empty) chain', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => routeApi(String(input))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Overview ──────────────────────────────────────────────────────────────

  it('reports the chain as operational at height 0', async () => {
    renderPage(<OverviewPage />);

    // Shown both as the headline and as the status pill — both are driven by
    // the node's own `status: RUNNING` / health `UP` readings.
    expect((await screen.findAllByText('Operational')).length).toBeGreaterThan(0);
    // The live reading is 0, and it is shown as 0 — not hidden, not inflated.
    await waitFor(() => expect(statByLabel('Block Height')).toHaveTextContent('0'));
    expect(statByLabel('Validators', 'p')).toHaveTextContent('1/1');
    expect(statByLabel('Peers')).toHaveTextContent('0');
    expect(statByLabel('Protocol Version')).toHaveTextContent('2.0');
    expect(statByLabel('Node Version')).toHaveTextContent('3.0.0');
    expect(statByLabel('Transactions')).toHaveTextContent('0');
  });

  it('shows the genesis block rather than fabricating activity', async () => {
    renderPage(<OverviewPage />);

    const table = await screen.findByRole('table');
    // Exactly one data row. A seeded or demo dataset would put 22 here.
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    const [height, hash, time, txs] = within(table).getAllByRole('cell');
    expect(height).toHaveTextContent('0');
    expect(hash).toHaveTextContent('046ceea3');
    expect(time).toHaveTextContent('2026');
    expect(txs).toHaveTextContent('0');
  });

  it('says plainly that there is no transaction history', async () => {
    renderPage(<OverviewPage />);

    expect(
      await screen.findByText('No transactions have been recorded yet'),
    ).toBeInTheDocument();
  });

  it('notes the genesis situation instead of a generic liveness claim', async () => {
    renderPage(<OverviewPage />);

    expect(
      await screen.findByText(/genesis block and no further activity/i),
    ).toBeInTheDocument();
  });

  // ── Empty states ──────────────────────────────────────────────────────────

  it('renders an empty transaction table without inventing rows', async () => {
    renderPage(<TransactionsPage />);

    expect(
      await screen.findByText('No transactions have been recorded yet'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('lists the single genesis block and nothing more', async () => {
    renderPage(<BlocksPage />);

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
  });

  it('lists the one real validator', async () => {
    renderPage(<ValidatorsPage />);

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
  });

  // ── Detail ────────────────────────────────────────────────────────────────

  it('shows block 0 as the genesis block, with no invented parent or proposer', async () => {
    renderRoute(<BlockDetailPage />, '/blocks/:height', '/blocks/0');

    expect(await screen.findByRole('heading', { name: 'Block 0' })).toBeInTheDocument();
    // A genesis block has an all-zero previous hash and no proposer. Both are
    // stated as facts rather than being left as bare zeros.
    expect(await screen.findByText('All zeros — genesis block, no parent')).toBeInTheDocument();
    expect(screen.getByText('None — the genesis block has no proposer')).toBeInTheDocument();
  });

  // ── Failure ───────────────────────────────────────────────────────────────

  it(
    'reports an unreachable chain and never shows placeholder figures',
    async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('offline');
        }),
      );

      renderPage(<OverviewPage />);

      // Each section that failed reports independently — no section is filled
      // in with a value to make the page look complete.
      const alerts = await screen.findAllByRole('alert', {}, { timeout: 15_000 });
      expect(alerts.length).toBeGreaterThan(0);
      const banner = alerts[0]!;
      expect(banner).toHaveTextContent(/could not be reached/i);
      // The copy is explicit that no figure stands in for the data it could
      // not verify.
      expect(banner).toHaveTextContent(/no network figures can be shown/i);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    },
    20_000,
  );
});
