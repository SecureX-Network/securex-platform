import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import SecurityEvidencePage from '../pages/SecurityEvidencePage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/explorer/security/evidence/:id"
          element={<SecurityEvidencePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SecurityEvidencePage', () => {
  it('renders hash and signature evidence for a forged-signature simulation', async () => {
    renderAt('/explorer/security/evidence/sim-0009');

    expect(await screen.findByText('Transaction hash')).toBeInTheDocument();
    expect(
      screen.getAllByText('Block hash').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rejected/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Invalid transaction signature/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Merkle proof path').length,
    ).toBeGreaterThan(0);
  });

  it('renders the demo evidence honesty notice', async () => {
    renderAt('/explorer/security/evidence/sim-0011');
    expect(await screen.findByText('Demo evidence')).toBeInTheDocument();
    expect(
      screen.getByText(/generated locally for this demonstration/i),
    ).toBeInTheDocument();
  });

  it('shows the related security event', async () => {
    renderAt('/explorer/security/evidence/sim-0009');
    expect(
      await screen.findByText('Forged signature detected'),
    ).toBeInTheDocument();
  });

  it('shows a graceful empty state for unknown evidence', async () => {
    renderAt('/explorer/security/evidence/nope');
    expect(await screen.findByText('Evidence not found')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Back to attack simulation/i }),
    ).toBeInTheDocument();
  });

  it('displays the evidence timeline', async () => {
    renderAt('/explorer/security/evidence/sim-0013');
    expect(await screen.findByText('Evidence timeline')).toBeInTheDocument();
    expect(screen.getByText('Request received')).toBeInTheDocument();
    expect(screen.getByText('Defense triggered')).toBeInTheDocument();
  });
});