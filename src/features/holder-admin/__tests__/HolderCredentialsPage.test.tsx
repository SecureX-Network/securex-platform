import { screen, waitFor } from '@testing-library/react';
import HolderCredentialsPage from '@/features/holder-admin/pages/HolderCredentialsPage';
import { renderWithProviders } from '@/test/test-utils';

describe('HolderCredentialsPage', () => {
  it('renders page heading', async () => {
    renderWithProviders(<HolderCredentialsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my credentials/i })).toBeInTheDocument();
    });
  });

  it('shows search input', async () => {
    renderWithProviders(<HolderCredentialsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
    });
  });

  it('shows status filter tabs', async () => {
    renderWithProviders(<HolderCredentialsPage />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /valid/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /expired/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /revoked/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /suspended/i })).toBeInTheDocument();
    });
  });

  it('shows sort select', async () => {
    renderWithProviders(<HolderCredentialsPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Sort credentials')).toBeInTheDocument();
    });
  });
});
