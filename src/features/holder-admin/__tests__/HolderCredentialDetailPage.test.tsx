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

  it('shows back link to the canonical credentials path', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      // /credentials is the canonical path. /holder/credentials is only a
      // legacy redirect, so the rendered link must not point at it.
      expect(screen.getByText(/back to credentials/i)).toHaveAttribute(
        'href',
        '/credentials',
      );
    });
  });

  // These two sections used to assert hardcoded claims the platform cannot
  // back: a "Blockchain Proof" card reading "Proof anchored to SecureX ledger"
  // with a fabricated "Recorded on-chain" block, and a "Digital Signature" card
  // reading "Ed25519-SHA256" / "Signature verified". Neither the chain anchor
  // nor the signature is performed by SecureX, so both were replaced with the
  // platform's own verification report, which marks unavailable checks as
  // "Not performed" rather than as a pass.
  it('does not claim a blockchain ledger anchor', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Credential Information')).toBeInTheDocument();
    });
    expect(screen.queryByText('Blockchain Proof')).not.toBeInTheDocument();
    expect(screen.queryByText(/anchored to securex ledger/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Recorded on-chain')).not.toBeInTheDocument();
  });

  it('does not claim a verified Ed25519 signature', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Credential Information')).toBeInTheDocument();
    });
    expect(screen.queryByText('Digital Signature')).not.toBeInTheDocument();
    expect(screen.queryByText('Ed25519-SHA256')).not.toBeInTheDocument();
    expect(screen.queryByText('Signature verified')).not.toBeInTheDocument();
    expect(screen.queryByText('Verified issuer')).not.toBeInTheDocument();
  });

  it('reports the real verification checks instead', async () => {
    renderWithProviders(<HolderCredentialDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Verification checks')).toBeInTheDocument();
    });
    expect(screen.getByText('Credential record')).toBeInTheDocument();
    expect(screen.getByText('Blockchain proof')).toBeInTheDocument();
    expect(screen.getByText('Signature')).toBeInTheDocument();
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
