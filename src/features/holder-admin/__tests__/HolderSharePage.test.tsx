import { screen, waitFor } from '@testing-library/react';
import HolderSharePage from '@/features/holder-admin/pages/HolderSharePage';
import { renderWithProviders } from '@/test/test-utils';

describe('HolderSharePage', () => {
  it('renders page heading', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /share a credential/i })).toBeInTheDocument();
    });
  });

  it('shows credential selection step', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByText(/choose a credential/i)).toBeInTheDocument();
    });
  });

  it('shows expiration step', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByText(/set expiration/i)).toBeInTheDocument();
    });
  });

  it('shows QR code step', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByText(/verification qr code/i)).toBeInTheDocument();
    });
  });

  it('shows share options step', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByText(/share options/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share via email/i })).toBeInTheDocument();
    });
  });

  it('shows security notice', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByText(/security notice/i)).toBeInTheDocument();
    });
  });
});
