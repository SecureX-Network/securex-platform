import { fireEvent, screen } from '@testing-library/react';
import { Input } from '@/components/ui/Input';
import { renderWithProviders } from '@/test/test-utils';

describe('Input', () => {
  it('renders with label', () => {
    renderWithProviders(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    renderWithProviders(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('handles value change', () => {
    renderWithProviders(<Input label="Name" />);
    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'John' } });
    expect(input).toHaveValue('John');
  });

  it('is disabled', () => {
    renderWithProviders(<Input label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});
