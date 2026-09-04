import { screen, waitFor } from '@testing-library/react';
import AdminIssuersPage from '@/features/holder-admin/pages/AdminIssuersPage';
import { renderWithProviders } from '@/test/test-utils';

describe('AdminIssuersPage', () => {
  it('renders page heading', async () => {
    renderWithProviders(<AdminIssuersPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /all issuers/i })).toBeInTheDocument();
    });
  });

  it('shows search input', async () => {
    renderWithProviders(<AdminIssuersPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search issuers/i)).toBeInTheDocument();
    });
  });

  it('shows institution filter', async () => {
    renderWithProviders(<AdminIssuersPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by institution')).toBeInTheDocument();
    });
  });

  it('shows status filter', async () => {
    renderWithProviders(<AdminIssuersPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });
  });

  it('loads and displays issuers table', async () => {
    renderWithProviders(<AdminIssuersPage />);
    await waitFor(() => {
      expect(screen.getByRole('table', { name: /issuers/i })).toBeInTheDocument();
    });
  });
});
