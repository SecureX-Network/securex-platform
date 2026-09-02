import { fireEvent, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { renderWithProviders } from '@/test/test-utils';

describe('Button', () => {
  it('renders with text', () => {
    renderWithProviders(<Button>Submit</Button>);
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('handles click', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button onClick={onClick}>Click me</Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner', () => {
    renderWithProviders(<Button isLoading>Save</Button>);
    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('applies variant classes', () => {
    renderWithProviders(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('bg-danger-600');
    expect(button).toHaveClass('text-white');
  });

  it('is disabled when disabled prop', () => {
    renderWithProviders(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled();
  });

  it('renders as link when href provided', () => {
    renderWithProviders(<Button href="/verify">Verify</Button>);
    const link = screen.getByRole('link', { name: /verify/i });
    expect(link).toHaveAttribute('href', '/verify');
    expect(link.tagName).toBe('A');
  });
});
