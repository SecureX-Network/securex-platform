import { screen, waitFor } from '@testing-library/react';
import AdminDashboardPage from '@/features/holder-admin/pages/AdminDashboardPage';
import { renderWithProviders } from '@/test/test-utils';

describe('AdminDashboardPage', () => {
  it('renders platform overview heading', async () => {
    renderWithProviders(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /platform overview/i })).toBeInTheDocument();
    });
  });

  it('shows REAL/DEMO mode indicator', async () => {
    renderWithProviders(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('mode-indicator')).toBeInTheDocument();
    });
  });

  it('shows system status indicator', async () => {
    renderWithProviders(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('All systems operational')).toBeInTheDocument();
    });
  });

  it('shows stat cards', async () => {
    renderWithProviders(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Verifications')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      expect(screen.getAllByText('Credentials').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows security alerts section', async () => {
    renderWithProviders(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Recent Security Alerts')).toBeInTheDocument();
    });
  });

  it('shows audit events section', async () => {
    renderWithProviders(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Recent Audit Events')).toBeInTheDocument();
    });
  });

  it('shows quick links', async () => {
    renderWithProviders(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick Links')).toBeInTheDocument();
      expect(screen.getByText('Security Alerts')).toBeInTheDocument();
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
    });
  });
});
