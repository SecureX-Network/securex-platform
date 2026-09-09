import { screen, waitFor } from '@testing-library/react';
import SecuritySettingsPage from '@/features/security-center/pages/SecuritySettingsPage';
import { renderWithProviders } from '@/test/test-utils';

describe('SecuritySettingsPage', () => {
  it('renders the system status heading', async () => {
    renderWithProviders(<SecuritySettingsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /system status/i })).toBeInTheDocument();
    });
  });

  it('lists service health', async () => {
    renderWithProviders(<SecuritySettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Platform API')).toBeInTheDocument();
      expect(screen.getByText('Blockchain Network')).toBeInTheDocument();
    });
  });

  it('shows service health overview', async () => {
    renderWithProviders(<SecuritySettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Service Health Overview')).toBeInTheDocument();
    });
  });

  it('shows active sessions', async () => {
    renderWithProviders(<SecuritySettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });
  });

  it('shows security configuration', async () => {
    renderWithProviders(<SecuritySettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Security Configuration')).toBeInTheDocument();
    });
  });
});