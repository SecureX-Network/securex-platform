import { screen, waitFor } from '@testing-library/react';
import SecurityAlertsPage from '@/features/security-center/pages/SecurityAlertsPage';
import { renderWithProviders } from '@/test/test-utils';

describe('SecurityAlertsPage', () => {
  it('renders the alerts heading', async () => {
    renderWithProviders(<SecurityAlertsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /security alerts/i })).toBeInTheDocument();
    });
  });

  it('shows severity filter', async () => {
    renderWithProviders(<SecurityAlertsPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by severity')).toBeInTheDocument();
    });
  });

  it('shows status filter', async () => {
    renderWithProviders(<SecurityAlertsPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });
  });

  it('renders alerts from the mock dataset', async () => {
    renderWithProviders(<SecurityAlertsPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/tamper attempt detected on credential/i),
      ).toBeInTheDocument();
    });
  });
});