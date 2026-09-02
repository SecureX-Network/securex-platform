import { screen } from '@testing-library/react';
import HomePage from '@/features/public/pages/HomePage';
import { renderWithProviders } from '@/test/test-utils';

describe('HomePage', () => {
  it('renders hero section', () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByRole('heading', {
        name: /blockchain-powered digital credential trust network/i,
      }),
    ).toBeInTheDocument();
  });

  it('shows SecureX branding', () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByText(/SecureX connects institutions/i),
    ).toBeInTheDocument();
  });

  it('has navigation links', () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByRole('link', { name: 'Verify Credential' }),
    ).toHaveAttribute('href', '/verify');
    expect(
      screen.getByRole('link', { name: 'Get Started' }),
    ).toHaveAttribute('href', '/auth/register');
  });
});
