import { screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';
import { renderWithProviders } from '@/test/test-utils';

describe('Badge', () => {
  it('renders with correct variant colors', () => {
    const { rerender } = renderWithProviders(
      <Badge variant="success">Active</Badge>,
    );
    const badge = screen.getByText('Active');
    expect(badge).toHaveClass('bg-trust-50');
    expect(badge).toHaveClass('text-trust-700');

    rerender(<Badge variant="danger">Revoked</Badge>);
    expect(screen.getByText('Revoked')).toHaveClass('bg-danger-50');
    expect(screen.getByText('Revoked')).toHaveClass('text-danger-700');
  });

  it('shows children text', () => {
    renderWithProviders(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { rerender } = renderWithProviders(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('text-[11px]');

    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium')).toHaveClass('text-xs');
  });
});
