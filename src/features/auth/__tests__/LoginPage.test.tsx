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

  it('shows demo credentials info', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
    expect(screen.getByText('admin@securex.io')).toBeInTheDocument();
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
