import { fireEvent, screen, waitFor } from '@testing-library/react';
import { parseSecureXQr, SECUREX_QR_PREFIX } from '@/utils/publicCredentialId';

const qrValues: string[] = [];
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => {
    qrValues.push(value);
    return <svg data-testid="qr-code" />;
  },
}));

const HolderSharePage = (await import('@/features/holder-admin/pages/HolderSharePage')).default;
const { renderWithProviders } = await import('@/test/test-utils');

describe('HolderSharePage', () => {
  beforeEach(() => {
    qrValues.length = 0;
  });

  it('encodes the scannable SecureX payload in the QR, not the verification URL', async () => {
    // The page used to encode `verificationUrl`, which the SecureX scanner
    // rejects ("not a SecureX QR code"), so a QR shown by the app could never
    // be read by the app's own verifier. `qrContent` is the field the scanner
    // accepts and `verificationUrl` is the field to share as a link.
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(qrValues.length).toBeGreaterThan(0);
    });

    const encoded = qrValues[qrValues.length - 1] ?? '';
    expect(encoded).not.toMatch(/^https?:\/\//);
    expect(encoded.startsWith(`${SECUREX_QR_PREFIX}.`)).toBe(true);
    expect(parseSecureXQr(encoded).ok).toBe(true);
  });

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

  // There is deliberately no "set expiration" step. The page used to write an
  // `?exp=` query parameter and tell the user "link expires in 7 days", but no
  // handler anywhere ever read that parameter, so the claim was false. The
  // step and the claim were removed together rather than left as decoration.
  it('does not offer a share-link expiration control', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /share a credential/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/set expiration/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/share link expiration/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/link expires in/i)).not.toBeInTheDocument();
  });

  it('states plainly that a generated share link does not expire', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /share a credential/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/does not expire/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /generate link/i }));

    await waitFor(() => {
      expect(screen.getByText(/does not expire/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/cannot be revoked/i)).toBeInTheDocument();
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

  it('warns that a share link reveals public credential details', async () => {
    renderWithProviders(<HolderSharePage />);
    await waitFor(() => {
      expect(screen.getByText(/before you share/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/treat it as public information/i),
    ).toBeInTheDocument();
  });
});
