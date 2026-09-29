import { screen } from '@testing-library/react';
import LoginPage from '@/features/auth/pages/LoginPage';
import { renderWithProviders } from '@/test/test-utils';

describe('LoginPage', () => {
  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('shows email and password inputs', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('offers a one-click demo account for every recorded role', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/demo accounts/i)).toBeInTheDocument();

    // A recorded demo has to be able to reach every role it narrates.
    for (const email of [
      'admin@securex.io',
      'emily.rodriguez@example.com',
      'marcus.johnson@acme.com',
      's.chen@stanford.edu',
      'cs-graduation@stanford.edu',
    ]) {
      expect(screen.getByText(email)).toBeInTheDocument();
    }

    expect(screen.getAllByRole('button', { name: 'Use' })).toHaveLength(5);
  });

  it('never renders a demo password in plaintext', () => {
    renderWithProviders(<LoginPage />);

    // The "Use" button fills the password field, so the panel does not need to
    // print it — and printing it would put a credential on a recorded video.
    expect(screen.queryByText('Password123!')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Password123!');
  });

  it('has link to register and forgot password', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute(
      'href',
      '/auth/register',
    );
    expect(
      screen.getByRole('link', { name: /forgot password/i }),
    ).toHaveAttribute('href', '/auth/forgot-password');
  });
});
