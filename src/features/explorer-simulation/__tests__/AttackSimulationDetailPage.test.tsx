import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AttackSimulationDetailPage from '../pages/AttackSimulationDetailPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/explorer/attack-simulation/:id"
          element={<AttackSimulationDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AttackSimulationDetailPage', () => {
  it('renders the scenario configuration for a scenario id', async () => {
    renderAt('/explorer/attack-simulation/scn-01-forged_signature');
    expect(
      await screen.findByRole('heading', { name: /Forged Signature/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Transaction signature validation/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Run simulation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Controlled simulation/i)).toBeInTheDocument();
  });

  it('renders a result for a completed simulation id', async () => {
    renderAt('/explorer/attack-simulation/sim-0009');
    expect(
      await screen.findByRole('heading', { name: /Forged Signature/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Detection result/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /View security evidence/i }).length,
    ).toBeGreaterThan(0);
  });

  it('shows progress stages when the simulation is run', async () => {
    renderAt('/explorer/attack-simulation/scn-02-replay_attack');
    const runButton = await screen.findByRole('button', {
      name: /Run simulation/i,
    });
    fireEvent.click(runButton);

    expect(
      await screen.findByText('Preparing scenario'),
    ).toBeInTheDocument();
    expect(screen.getByText('Attack detected / rejected')).toBeInTheDocument();
    expect(screen.getByLabelText('Simulation progress')).toBeInTheDocument();
  });

  it('shows a graceful empty state for an unknown id', async () => {
    renderAt('/explorer/attack-simulation/nope');
    expect(
      await screen.findByText('Simulation not found'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Back to attack simulation/i }),
    ).toBeInTheDocument();
  });
});