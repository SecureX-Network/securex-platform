import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AttackSimulationPage from '../pages/AttackSimulationPage';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/features/explorer-simulation/services/attackSimulationService', () => ({
  getAttackScenarios: vi.fn(async () => []),
  getSimulationResults: vi.fn(async () => []),
}));

describe('AttackSimulationPage states', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading skeletons while the page loads', () => {
    vi.useFakeTimers();
    renderWithProviders(<AttackSimulationPage />);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows an empty state when no simulations exist', async () => {
    renderWithProviders(<AttackSimulationPage />);
    expect(await screen.findByText('No simulations yet')).toBeInTheDocument();
    expect(screen.queryByText('sim-0009')).not.toBeInTheDocument();
  });
});