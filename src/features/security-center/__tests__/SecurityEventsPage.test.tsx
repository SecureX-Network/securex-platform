import { screen, waitFor } from '@testing-library/react';
import SecurityEventsPage from '@/features/security-center/pages/SecurityEventsPage';
import { renderWithProviders } from '@/test/test-utils';

describe('SecurityEventsPage', () => {
  it('renders the events heading', async () => {
    renderWithProviders(<SecurityEventsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /security events/i })).toBeInTheDocument();
    });
  });

  it('shows the search input', async () => {
    renderWithProviders(<SecurityEventsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search action, actor, target/i)).toBeInTheDocument();
    });
  });

  it('shows audit events derived from the dataset', async () => {
    renderWithProviders(<SecurityEventsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Credential Issued').length).toBeGreaterThan(0);
    });
  });

  it('renders the events table', async () => {
    renderWithProviders(<SecurityEventsPage />);
    await waitFor(() => {
      expect(screen.getByRole('table', { name: /security events/i })).toBeInTheDocument();
    });
  });
});