import { screen, waitFor } from '@testing-library/react';
import HolderCredentialDetailPage from '@/features/holder-admin/pages/HolderCredentialDetailPage';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ credentialId: 'cred-001' }),
  };
});

describe('HolderCredentialDetailPage', () => {
  it('shows loading state initially', () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    expect(screen.getByText('Loading credential')).toBeInTheDocument();
  });

  it('renders credential detail after load', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Credential Information')).toBeInTheDocument();
    });
  });

  it('shows back link to credentials', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/back to credentials/i)).toHaveAttribute(
        'href',
        '/holder/credentials',
      );
    });
  });

  it('shows blockchain proof section', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Blockchain Proof')).toBeInTheDocument();
    });
  });

  it('shows digital signature section', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Digital Signature')).toBeInTheDocument();
    });
  });

  it('shows lifecycle history section', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lifecycle History')).toBeInTheDocument();
    });
  });

  it('shows share section', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument();
      expect(screen.getByText(/share this credential/i)).toBeInTheDocument();
    });
  });
});
