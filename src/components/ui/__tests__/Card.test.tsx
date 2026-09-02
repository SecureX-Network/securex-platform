import { screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';
import { renderWithProviders } from '@/test/test-utils';

describe('Card', () => {
  it('renders children', () => {
    renderWithProviders(<Card>Hello world</Card>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows title and description', () => {
    renderWithProviders(
      <Card title="Overview" description="Your activity summary">
        Content
      </Card>,
    );
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByText('Your activity summary')).toBeInTheDocument();
  });

  it('applies className', () => {
    renderWithProviders(<Card className="custom-card">Content</Card>);
    const card = document.querySelector('.custom-card');
    expect(card).not.toBeNull();
    expect(card).toHaveClass('rounded-xl');
  });
});
