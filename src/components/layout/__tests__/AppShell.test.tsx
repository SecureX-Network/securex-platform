import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '@/constants';
import type { User } from '@/types';

const baseUser: User = {
  id: 'usr-holder-001',
  email: 'emily.rodriguez@example.com',
  name: 'Emily Rodriguez',
  role: 'HOLDER',
  createdAt: '2024-01-01T00:00:00Z',
};

function renderShell(overrides: Partial<User> = {}) {
  const user = { ...baseUser, ...overrides };
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(AUTH_TOKEN_KEY, 'token');
  return render(
    <MemoryRouter initialEntries={['/holder/dashboard']}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
});

describe('AppShell', () => {
  it('shows the sidebar groups with the user role context', async () => {
    renderShell();
    expect(
      await screen.findByText('Workspace', { selector: '.uppercase.tracking-widest' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Trust', { selector: '.uppercase.tracking-widest' })).toBeInTheDocument();
    expect(screen.getByText('System', { selector: '.uppercase.tracking-widest' })).toBeInTheDocument();
  });

  it('renders role-appropriate navigation for a HOLDER', async () => {
    renderShell();
    const wallet = await screen.findByText('My Wallet');
    expect(wallet).toBeInTheDocument();
    expect(screen.getByText('My Credentials')).toBeInTheDocument();
    expect(screen.queryByText('Issue Credential')).not.toBeInTheDocument();
    expect(screen.queryByText('Security Center')).not.toBeInTheDocument();
  });

  it('renders the header with notifications and a role label', async () => {
    renderShell();
    await screen.findByText('My Wallet');
    expect(
      screen.getByRole('button', { name: /notifications \(\d+ unread\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('holder')).toBeInTheDocument();
  });

  it('renders a search button that opens the command palette', async () => {
    renderShell();
    await screen.findByText('My Wallet');
    const searchButton = screen.getAllByRole('button', { name: /search securex/i })[0]!;
    searchButton.click();
    expect(
      await screen.findByRole('dialog', { name: 'Search SecureX' }),
    ).toBeInTheDocument();
  });

  it('shows network/system nav only when permitted for an ADMIN', async () => {
    renderShell({ id: 'usr-admin-001', role: 'ADMIN', email: 'admin@securex.io', name: 'Alex Morgan' });
    await screen.findByText('Security Center');
    expect(screen.getByText('Fraud & Tampering')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });
});