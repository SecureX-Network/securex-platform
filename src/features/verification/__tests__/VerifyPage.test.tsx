import { screen } from '@testing-library/react';
import VerifyPage from '@/features/verification/pages/VerifyPage';
import { renderWithProviders } from '@/test/test-utils';

describe('VerifyPage', () => {
  it('renders verification input', () => {
    renderWithProviders(<VerifyPage />);
    expect(screen.getByLabelText('Credential ID')).toBeInTheDocument();
  });

  it('shows QR code area placeholder', () => {
    renderWithProviders(<VerifyPage />);
    expect(
      screen.getByRole('heading', { name: /scan a qr code/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/qr scanner coming soon/i)).toBeInTheDocument();
  });

  it('has search button', () => {
    renderWithProviders(<VerifyPage />);
    expect(
      screen.getByRole('button', { name: /verify/i }),
    ).toBeInTheDocument();
  });
});
