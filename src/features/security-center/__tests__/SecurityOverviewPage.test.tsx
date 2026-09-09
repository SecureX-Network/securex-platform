import { screen, waitFor } from '@testing-library/react';
import SecurityOverviewPage from '@/features/security-center/pages/SecurityOverviewPage';
import { renderWithProviders } from '@/test/test-utils';

describe('SecurityOverviewPage', () => {
  it('renders the security center heading', async () => {
    renderWithProviders(<SecurityOverviewPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /security center/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows a security score', async () => {
    renderWithProviders(<SecurityOverviewPage />);
    await waitFor(() => {
      expect(screen.getByText('Security Score')).toBeInTheDocument();
    });
  });

  it('shows active alerts summary', async () => {
    renderWithProviders(<SecurityOverviewPage />);
    await waitFor(() => {
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    });
  });

  it('shows credential integrity block', async () => {
    renderWithProviders(<SecurityOverviewPage />);
    await waitFor(() => {
      expect(screen.getByText('Credential Integrity')).toBeInTheDocument();
    });
  });

  it('shows recent alerts section', async () => {
    renderWithProviders(<SecurityOverviewPage />);
    await waitFor(() => {
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    });
  });

  it('links to fraud and tampering', async () => {
    renderWithProviders(<SecurityOverviewPage />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /fraud & tampering/i });
      expect(link).toHaveAttribute('href', '/fraud');
    });
  });
});