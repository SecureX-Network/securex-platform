import { screen, waitFor } from '@testing-library/react';
import HolderDashboardPage from '@/features/holder-admin/pages/HolderDashboardPage';
import { renderWithProviders } from '@/test/test-utils';

describe('HolderDashboardPage', () => {
  it('renders welcome heading', async () => {
    renderWithProviders(<HolderDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });

  it('shows stat cards', async () => {
    renderWithProviders(<HolderDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Credentials')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.getByText('Revoked / Suspended')).toBeInTheDocument();
    });
  });

  it('shows quick actions section', async () => {
    renderWithProviders(<HolderDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('View Credentials')).toBeInTheDocument();
      expect(screen.getByText('Share Credential')).toBeInTheDocument();
    });
  });

  it('shows recent credentials section', async () => {
    renderWithProviders(<HolderDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Recent Credentials')).toBeInTheDocument();
    });
  });

  it('shows notifications section', async () => {
    renderWithProviders(<HolderDashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    });
  });
});
