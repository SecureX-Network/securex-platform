import { render } from '@testing-library/react';
import { ModeIndicator } from '@/components/ui/ModeIndicator';

describe('ModeIndicator', () => {
  it('renders with a visible label', () => {
    const { getByTestId } = render(<ModeIndicator />);
    const el = getByTestId('mode-indicator');
    expect(el).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { getByTestId } = render(<ModeIndicator className="my-class" />);
    expect(getByTestId('mode-indicator')).toHaveClass('my-class');
  });
});
