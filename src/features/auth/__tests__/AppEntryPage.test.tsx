import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@/app/providers/AuthProvider';
import AppEntryPage from '@/features/auth/pages/AppEntryPage';
import { AUTH_USER_KEY, AUTH_TOKEN_KEY } from '@/constants';
import type { User, UserRole } from '@/types';

const baseUser: User = {
  id: 'usr-test-001',
  email: 'holder@example.com',
  name: 'Test User',
  role: 'HOLDER',
  createdAt: '2024-01-01T00:00:00Z',
};

function makeUser(overrides: Partial<User> = {}): User {
  return { ...baseUser, ...overrides };
}

function renderEntry(overrides?: Partial<User>) {
  if (overrides) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(makeUser(overrides)));
    window.localStorage.setItem(AUTH_TOKEN_KEY, 'token');
  }
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppEntryPage />} />
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route path="/auth/register" element={<div>Register Page</div>} />
          <Route path="/verify" element={<div>Verify Page</div>} />
          <Route path="/explorer" element={<div>Explorer Page</div>} />
          <Route path="/holder/dashboard" element={<div>Holder Dashboard Page</div>} />
          <Route path="/institution/dashboard" element={<div>Institution Dashboard Page</div>} />
          <Route path="/employer/dashboard" element={<div>Employer Dashboard Page</div>} />
          <Route path="/admin/dashboard" element={<div>Admin Dashboard Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
});

describe('AppEntryPage (unauthenticated root)', () => {
  it('renders the application gateway, not marketing content', async () => {
    renderEntry();
    expect(
      await screen.findByRole('heading', { level: 1, name: /digital credentials\. built for trust\./i }),
    ).toBeInTheDocument();
    expect(screen.getByText('WebApp')).toBeInTheDocument();
    expect(screen.queryByText(/blockchain-powered/i)).not.toBeInTheDocument();
    expect(screen.queryByText('10,000+')).not.toBeInTheDocument();
  });

  it('links Sign In to /auth/login', async () => {
    renderEntry();
    const link = (await screen.findAllByRole('link', { name: /sign in/i }))[0];
    expect(link).toHaveAttribute('href', '/auth/login');
  });

  it('links Create Account to /auth/register', async () => {
    renderEntry();
    const link = (await screen.findAllByRole('link', { name: /create account/i }))[0];
    expect(link).toHaveAttribute('href', '/auth/register');
  });

  it('links Verify a Credential to /verify', async () => {
    renderEntry();
    const link = (await screen.findAllByRole('link', { name: /verify a credential/i }))[0];
    expect(link).toHaveAttribute('href', '/verify');
  });

  it('links the network explorer to /explorer', async () => {
    renderEntry();
    const explorer = await screen.findAllByRole('link', { name: /explore the network|network explorer/i });
    const hrefs = explorer.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/explorer');
  });

  it('exposes a public website reference that does not replace the app', async () => {
    renderEntry();
    const publicSite = await screen.findByRole('link', { name: /public website/i });
    expect(publicSite).toHaveAttribute('href', 'https://securex.sp-net.in');
  });
});

describe('AppEntryPage (authenticated root redirects by role)', () => {
  const cases: Array<{ role: UserRole; expected: string }> = [
    { role: 'HOLDER', expected: 'Holder Dashboard Page' },
    { role: 'INSTITUTION', expected: 'Institution Dashboard Page' },
    { role: 'ISSUER', expected: 'Institution Dashboard Page' },
    { role: 'EMPLOYER', expected: 'Employer Dashboard Page' },
    { role: 'ADMIN', expected: 'Admin Dashboard Page' },
    { role: 'SECURITY_ADMIN', expected: 'Admin Dashboard Page' },
    { role: 'NETWORK_ADMIN', expected: 'Admin Dashboard Page' },
    { role: 'AUDITOR', expected: 'Admin Dashboard Page' },
  ];

  cases.forEach(({ role, expected }) => {
    it(`routes ${role} to the expected dashboard`, async () => {
      renderEntry({ role });
      expect(await screen.findByText(expected)).toBeInTheDocument();
    });
  });

  it('keeps the session intact after a refresh-style reload', async () => {
    renderEntry({ role: 'HOLDER' });
    expect(await screen.findByText('Holder Dashboard Page')).toBeInTheDocument();
    expect(window.localStorage.getItem(AUTH_USER_KEY)).not.toBeNull();
  });
});