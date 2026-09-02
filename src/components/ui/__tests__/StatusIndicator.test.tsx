import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

const STATUS_DOTS: Record<string, string> = {
  VALID: 'bg-trust-500',
  INVALID: 'bg-danger-500',
  REVOKED: 'bg-danger-500',
  SUSPENDED: 'bg-warning-500',
  EXPIRED: 'bg-neutral-400',
  TAMPERED: 'bg-danger-500',
  SUSPICIOUS: 'bg-warning-500',
  NOT_FOUND: 'bg-neutral-400',
};

describe('StatusIndicator', () => {
  it('renders correct color for each status', () => {
    for (const [status, dotClass] of Object.entries(STATUS_DOTS)) {
      const { container } = render(
        <StatusIndicator status={status as never} showLabel={false} />,
      );
      const dot = container.querySelector('.shrink-0.rounded-full');
      expect(dot).not.toBeNull();
      expect(dot).toHaveClass(dotClass);
    }
  });

  it('shows label when showLabel is true', () => {
    render(<StatusIndicator status="VALID" showLabel />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });
});
