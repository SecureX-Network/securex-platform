import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import VerifyCredentialPage from '@/features/public-verification/pages/VerifyCredentialPage';
import type { VerificationView } from '@/features/holder-admin/services/holderAdminService';
import { ApiError } from '@/services/api/client';

vi.mock('@/features/holder-admin/services/holderAdminService', () => ({
  verifyRealCredential: vi.fn(),
}));

import { verifyRealCredential } from '@/features/holder-admin/services/holderAdminService';
const viewMock = vi.mocked(verifyRealCredential);

const validView: VerificationView = {
  status: 'VALID',
  credentialId: 'SX-7A31-C0E4-19F6',
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

const revokedView: VerificationView = {
  status: 'REVOKED',
  credentialId: 'SX-4B8D-6A2F-C701',
  issuer: {
    issuerId: 'issuer-1',
    name: 'SecureX Demo University',
    publicKey: 'pubkey',
    status: 'ACTIVE',
  },
  verifiedAt: '2024-01-03T00:00:00.000Z',
};

const notFoundView: VerificationView = {
  status: 'NOT_FOUND',
  credentialId: 'SX-ABCD-0000-0000',
  message: 'Credential not found on the SecureX ledger.',
};

const unverifiableView: VerificationView = {
  status: 'UNVERIFIABLE',
  credentialId: 'SX-A1B2-0000-0000',
};

const tamperView: VerificationView = {
  ...validView,
  documentHashCheck: {
    credentialId: 'SX-7A31-C0E4-19F6',
    suppliedHash: 'a'.repeat(64),
    anchoredHash: 'b'.repeat(64),
    hashMatch: false,
    status: 'TAMPERED',
    verifiedAt: '2024-01-03T00:00:00.000Z',
  },
};

function renderPage(initialEntries: string[] = ['/verify/SX-7A31-C0E4-19F6']) {
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

  it('shows a loading state while verifying', () => {
    viewMock.mockImplementationOnce(
      () =>
        new Promise<VerificationView>(() => {
          // never resolves to keep the loading state visible
        }),
    );
    renderPage();
    expect(
      screen.getByRole('status', { name: /verifying credential/i }),
    ).toBeInTheDocument();
  });

  it('shows a valid result sourced from the real backend', async () => {
    viewMock.mockResolvedValueOnce(validView);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Credential verified')).toBeInTheDocument();
    });
    expect(viewMock).toHaveBeenCalledWith('SX-7A31-C0E4-19F6', undefined);
    expect(screen.getByText('Anchored to SecureX ledger')).toBeInTheDocument();
  });

  it('shows a revoked result without assuming block/transaction data', async () => {
    viewMock.mockResolvedValueOnce(revokedView);
    renderPage(['/verify/SX-4B8D-6A2F-C701']);
    await waitFor(() => {
      expect(screen.getByText('Credential is not valid')).toBeInTheDocument();
    });
    expect(
      screen.getByText('No on-ledger record available'),
    ).toBeInTheDocument();
  });

  it('shows a not-found result when the backend returns NOT_FOUND', async () => {
    viewMock.mockResolvedValueOnce(notFoundView);
    renderPage(['/verify/SX-ABCD-0000-0000']);
    await waitFor(() => {
      expect(screen.getByText('Credential not found')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Credential not found on the SecureX ledger.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No on-ledger record available')).toBeInTheDocument();
  });

  it('shows an unverifiable result', async () => {
    viewMock.mockResolvedValueOnce(unverifiableView);
    renderPage(['/verify/SX-A1B2-0000-0000']);
    await waitFor(() => {
      expect(
        screen.getByText('Credential could not be verified'),
      ).toBeInTheDocument();
    });
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
      expect(viewMock).toHaveBeenCalledWith('SX-7A31-C0E4-19F6', 'a'.repeat(64));
      expect(screen.getByText('Document tampered')).toBeInTheDocument();
    });
  });

  it('shows a friendly message when the verification service is unreachable', async () => {
    viewMock.mockRejectedValueOnce(new ApiError('Unable to reach the service.', 0));
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(
          'The verification service is temporarily unavailable. Please check your connection and try again.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('shows a generic message for unexpected backend failures', async () => {
    viewMock.mockRejectedValueOnce(new ApiError('Internal backend error.', 500));
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('Could not complete verification at this time. Please try again.'),
      ).toBeInTheDocument();
    });
  });

  it('retries the verification when the user clicks Try again', async () => {
    viewMock
      .mockRejectedValueOnce(new ApiError('Unable to reach the service.', 0))
      .mockResolvedValueOnce(validView);

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(viewMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Credential verified')).toBeInTheDocument();
    });
  });
});
