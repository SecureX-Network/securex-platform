import { screen, waitFor } from '@testing-library/react';
import AdminUsersPage from '@/features/holder-admin/pages/AdminUsersPage';
import { renderWithProviders } from '@/test/test-utils';

describe('AdminUsersPage', () => {
  it('renders page heading', async () => {
    renderWithProviders(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
    });
  });

  it('shows user counts in description', async () => {
    renderWithProviders(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.getByText(/holders/i)).toBeInTheDocument();
      expect(screen.getByText(/institutions/i)).toBeInTheDocument();
      expect(screen.getByText(/employers/i)).toBeInTheDocument();
    });
  });

  it('shows search input', async () => {
    renderWithProviders(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
    });
  });

  it('shows role filter', async () => {
    renderWithProviders(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by role')).toBeInTheDocument();
    });
  });

  it('loads and displays users table', async () => {
    renderWithProviders(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.getByRole('table', { name: /users/i })).toBeInTheDocument();
    });
  });
});
