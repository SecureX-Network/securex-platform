import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import VerifyCredentialPage from '@/features/public-verification/pages/VerifyCredentialPage';
import type {
  VerificationStatus,
  VerificationView,
} from '@/features/holder-admin/services/holderAdminService';
import { ApiError } from '@/services/api/client';

vi.mock('@/features/public-verification/services/publicVerificationService', () => ({
  verifyPublicCredential: vi.fn(),
}));

import { verifyPublicCredential } from '@/features/public-verification/services/publicVerificationService';
const viewMock = vi.mocked(verifyPublicCredential);

const NOT_PERFORMED = {
  verified: false,
  available: false,
  status: 'UNVERIFIED' as const,
  detail: 'SecureX does not perform this check, so nothing is claimed about it.',
};

const RECORD_FOUND = {
  verified: true,
  available: true,
  status: 'VERIFIED' as const,
  detail: 'A credential record with this ID exists in the SecureX Platform.',
};

const RECORD_MISSING = {
  verified: false,
  available: true,
  status: 'NOT_FOUND' as const,
  detail: 'No credential record with this ID exists in the SecureX Platform.',
};

function buildView(
  status: VerificationStatus,
  overrides: Partial<VerificationView> = {},
): VerificationView {
  return {
    credentialId: 'SX-7A31-C0E4-19F6',
    status,
    storedStatus: status,
    issuerName: 'SecureX Demo University',
    issuedAt: '2024-01-02T00:00:00.000Z',
    expiresAt: null,
    revokedAt: null,
    verifiedAt: '2024-01-03T00:00:00.000Z',
    checks: {
      credentialRecord: RECORD_FOUND,
      blockchainProof: NOT_PERFORMED,
      signature: NOT_PERFORMED,
    },
    message: 'Credential record verified.',
    ...overrides,
  };
}

const validView = buildView('VALID');
const revokedView = buildView('REVOKED', {
  credentialId: 'SX-4B8D-6A2F-C701',
  revokedAt: '2024-03-01T00:00:00.000Z',
  message: 'Credential record found. It has been revoked and is no longer VALID.',
});
const notFoundView = buildView('NOT_FOUND', {
  credentialId: 'SX-ABCD-0000-0000',
  issuerName: null,
  issuedAt: null,
  checks: {
    credentialRecord: RECORD_MISSING,
    blockchainProof: NOT_PERFORMED,
    signature: NOT_PERFORMED,
  },
  message: 'No credential record with this ID exists in the SecureX Platform.',
});
const expiredView = buildView('EXPIRED', {
  storedStatus: 'VALID',
  expiresAt: '2023-06-01T00:00:00.000Z',
  message: 'Credential record found, but it is past its expiration date.',
});
const tamperView = buildView('VALID', {
  documentIntegrity: {
    credentialId: 'SX-7A31-C0E4-19F6',
    suppliedHash: 'a'.repeat(64),
    hashMatch: false,
    status: 'TAMPERED',
    scope: 'PLATFORM_RECORD',
    detail: 'The supplied hash does not match the platform record.',
    verifiedAt: '2024-01-03T00:00:00.000Z',
  },
});

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

  it('shows a valid result and names the issuer without inventing a ledger proof', async () => {
    viewMock.mockResolvedValueOnce(validView);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Credential verified')).toBeInTheDocument();
    });
    expect(viewMock).toHaveBeenCalledWith('SX-7A31-C0E4-19F6', undefined);
    expect(screen.getByText('SecureX Demo University')).toBeInTheDocument();
    // The blockchain proof is reported as not performed, never as verified.
    expect(screen.getAllByText('Not performed')).toHaveLength(2);
    expect(screen.queryByText('Anchored to SecureX ledger')).not.toBeInTheDocument();
  });

  it('shows a revoked result', async () => {
    viewMock.mockResolvedValueOnce(revokedView);
    renderPage(['/verify/SX-4B8D-6A2F-C701']);
    await waitFor(() => {
      expect(screen.getByText('Credential is not valid')).toBeInTheDocument();
    });
  });

  it('shows a not-found result when the backend returns NOT_FOUND', async () => {
    viewMock.mockResolvedValueOnce(notFoundView);
    renderPage(['/verify/SX-ABCD-0000-0000']);
    await waitFor(() => {
      expect(screen.getByText('Credential not found')).toBeInTheDocument();
    });
    expect(
      screen.getAllByText('No credential record with this ID exists in the SecureX Platform.'),
    ).toHaveLength(2);
    expect(screen.getByText('No record')).toBeInTheDocument();
  });

  it('shows an expired result and states that the status was derived', async () => {
    viewMock.mockResolvedValueOnce(expiredView);
    renderPage(['/verify/SX-7A31-C0E4-19F6']);
    await waitFor(() => {
      expect(screen.getByText('Credential expired')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/EXPIRED \(derived from the expiration date on the record\)/),
    ).toBeInTheDocument();
  });

  it('states plainly that no document hash was supplied when none was given', async () => {
    viewMock.mockResolvedValueOnce(validView);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Credential verified')).toBeInTheDocument();
    });
    expect(screen.getByText('No document hash was supplied')).toBeInTheDocument();
  });

  it('surfaces a TAMPERED document integrity result when the hash differs', async () => {
    viewMock.mockResolvedValueOnce(tamperView);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('Document does not match the platform record'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('The supplied hash does not match the platform record.'),
    ).toBeInTheDocument();
  });

  it('runs a document integrity check with the supplied hash via the real backend', async () => {
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
      expect(
        screen.getByText('Document does not match the platform record'),
      ).toBeInTheDocument();
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
