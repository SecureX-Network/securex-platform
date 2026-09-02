import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import AttackSimulationPage from '../pages/AttackSimulationPage';
import { renderWithProviders } from '@/test/test-utils';

describe('AttackSimulationPage', () => {
  it('renders the page heading and demo notice', async () => {
    renderWithProviders(<AttackSimulationPage />);
    expect(
      await screen.findByRole('heading', { name: /Attack Simulation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Controlled demonstration')).toBeInTheDocument();
  });

  it('renders all six attack scenario cards', async () => {
    renderWithProviders(<AttackSimulationPage />);
    expect(
      (await screen.findAllByText('Forged Signature')).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Replay Attack (Duplicate Submission)').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Block Tampering (Hash Mismatch)').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Unauthorized Proposer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Invalid Merkle Proof').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Invalid Lifecycle Transition').length,
    ).toBeGreaterThan(0);
  });

  it('shows the simulation history with a seeded result', async () => {
    renderWithProviders(<AttackSimulationPage />);
    expect(await screen.findByText('sim-0009')).toBeInTheDocument();
    expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Forged Signature').length,
    ).toBeGreaterThan(0);
  });

  it('displays attack and expected-defense copy on the cards', async () => {
    renderWithProviders(<AttackSimulationPage />);
    expect(
      (await screen.findAllByText('Attack')).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Expected defense').length).toBeGreaterThan(0);
  });
});