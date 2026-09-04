import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import VerifyCredentialPage from '@/features/public-verification/pages/VerifyCredentialPage';
import type { VerificationView } from '@/features/holder-admin/services/holderAdminService';

vi.mock('@/features/holder-admin/services/holderAdminService', () => ({
  verifyRealCredential: vi.fn(),
}));

import { verifyRealCredential } from '@/features/holder-admin/services/holderAdminService';
const viewMock = vi.mocked(verifyRealCredential);

const validView: VerificationView = {
  status: 'VALID',
  credentialId: 'sxu-mtech-2026-0001',
  issuer: {
    issuerId: 'issuer-1',
    name: 'SecureX Demo University',
    publicKey: 'pubkey',
    status: 'ACTIVE',
  },
  issuerSignatureValid: true,
  transaction: { id: 'tx-1', type: 'CREDENTIAL_ISSUE', blockHeight: 5, blockHash: 'block-5' },
  block: { height: 5, hash: 'block-5', timestamp: '2024-01-02T00:00:00.000Z', proposer: 'val-1' },
  verifiedAt: '2024-01-03T00:00:00.000Z',
  securityChecks: { issuerSignatureValid: true },
};

const tamperView: VerificationView = {
  ...validView,
  documentHashCheck: {
    credentialId: 'sxu-mtech-2026-0001',
    suppliedHash: 'a'.repeat(64),
    anchoredHash: 'b'.repeat(64),
    hashMatch: false,
    status: 'TAMPERED',
    verifiedAt: '2024-01-03T00:00:00.000Z',
  },
};

function renderPage(initialEntries: string[] = ['/verify/sxu-mtech-2026-0001']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/verify/:credentialId" element={<VerifyCredentialPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyCredentialPage (real backend verification)', () => {
  beforeEach(() => {
    viewMock.mockReset();
  });

  it('shows a valid result sourced from the real backend', async () => {
    viewMock.mockResolvedValueOnce(validView);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Credential verified')).toBeInTheDocument();
    });
    expect(viewMock).toHaveBeenCalledWith('sxu-mtech-2026-0001', undefined);
  });

  it('surfaces documentHashCheck TAMPERED when the anchored hash differs', async () => {
    viewMock.mockResolvedValueOnce(tamperView);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Document tampered')).toBeInTheDocument();
    });
  });

  it('runs a document tamper check with the supplied hash via the real backend', async () => {
    viewMock.mockResolvedValueOnce(validView);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Credential verified')).toBeInTheDocument();
    });

    viewMock.mockResolvedValueOnce(tamperView);
    await userEvent.type(screen.getByLabelText('Document hash'), 'a'.repeat(64));
    await userEvent.click(screen.getByRole('button', { name: /check integrity/i }));

    await waitFor(() => {
      expect(viewMock).toHaveBeenCalledWith('sxu-mtech-2026-0001', 'a'.repeat(64));
      expect(screen.getByText('Document tampered')).toBeInTheDocument();
    });
  });
});
