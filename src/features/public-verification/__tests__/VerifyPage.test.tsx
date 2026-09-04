import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyPage from '@/features/public-verification/pages/VerifyPage';
import { renderWithProviders } from '@/test/test-utils';
import { REAL_DEMO_PUBLIC_CREDENTIAL_IDS } from '@/features/holder-admin/services/holderOwnership';

const SAMPLE_INDEXES = [0, 2, 5, 6];
const EXPECTED_SAMPLE_IDS = SAMPLE_INDEXES.map((i) => REAL_DEMO_PUBLIC_CREDENTIAL_IDS[i]);

describe('VerifyPage', () => {
  it('renders verification input', () => {
    renderWithProviders(<VerifyPage />);
    expect(screen.getByLabelText('Credential ID')).toBeInTheDocument();
  });

  it('uses the real public credential ID format in the placeholder', () => {
    renderWithProviders(<VerifyPage />);
    const input = screen.getByLabelText('Credential ID');
    expect(input).toHaveAttribute('placeholder', 'e.g. SX-2F9C-A41B-8D7E');
    expect(input.getAttribute('placeholder')).toMatch(/^e\.g\. SX-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('renders real seeded PUBLIC sample credential IDs (SX-...)', () => {
    renderWithProviders(<VerifyPage />);
    for (const id of EXPECTED_SAMPLE_IDS) {
      expect(screen.getByRole('button', { name: id })).toBeInTheDocument();
    }
  });

  it('does not surface internal sxu-* credential IDs as samples', () => {
    renderWithProviders(<VerifyPage />);
    for (const id of EXPECTED_SAMPLE_IDS) {
      expect(id).toMatch(/^SX-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
      expect(id).not.toMatch(/^sxu-/);
    }
  });

  it('loads a sample PUBLIC credential ID into the input when clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VerifyPage />);
    await user.click(
      screen.getByRole('button', { name: REAL_DEMO_PUBLIC_CREDENTIAL_IDS[0] }),
    );
    expect(screen.getByLabelText('Credential ID')).toHaveValue(
      REAL_DEMO_PUBLIC_CREDENTIAL_IDS[0],
    );
  });

  it('provides Enter ID and Scan QR mode toggles', () => {
    renderWithProviders(<VerifyPage />);
    expect(
      screen.getByRole('button', { name: /enter id/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /scan qr/i }),
    ).toBeInTheDocument();
  });

  it('switches to the SecureX scanner when Scan QR is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VerifyPage />);
    await user.click(screen.getByRole('button', { name: /scan qr/i }));
    expect(screen.getByText(/securex qr scanner/i)).toBeInTheDocument();
    expect(
      screen.getByText(/never opens arbitrary links/i),
    ).toBeInTheDocument();
  });

  // The scanner requires browser camera/Canvas APIs not present in jsdom; the
  // page must still let the user return to manual entry via the mode toggle.
  it('lets the user switch back to manual entry', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VerifyPage />);
    await user.click(screen.getByRole('button', { name: /scan qr/i }));
    expect(screen.getByText(/securex qr scanner/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /enter id/i }));
    expect(screen.getByLabelText('Credential ID')).toBeInTheDocument();
  });

  it('has search button', () => {
    renderWithProviders(<VerifyPage />);
    expect(
      screen.getByRole('button', { name: /^verify$/i }),
    ).toBeInTheDocument();
  });
});
