import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Fingerprint,
  Printer,
  Search,
  Share2,
} from 'lucide-react';
import { Button, Card, Input, Spinner, ErrorState } from '@/components/ui';
import { RealVerificationResult } from '@/features/public-verification/components/RealVerificationResult';
import { ROUTES } from '@/constants';
import { ApiError } from '@/services/api/client';
import { verifyRealCredential } from '@/features/holder-admin/services/holderAdminService';
import type { VerificationView } from '@/features/holder-admin/services/holderAdminService';
import { normalizeCredentialInput } from '@/utils/publicCredentialId';

/**
 * Map a verification failure to a safe, user-facing message that never leaks
 * internal URLs, stack traces, or server implementation details.
 *
 * Network/timeout failures surface as ApiError with status 0 (see client.ts);
 * these mean the verification service could not be reached and warrant a clear
 * "temporarily unavailable" message with a retry. Any other failure is shown as
 * a generic, non-technical message.
 */
function friendlyVerificationError(err: unknown): string {
  if (err instanceof ApiError && err.status === 0) {
    return 'The verification service is temporarily unavailable. Please check your connection and try again.';
  }
  return 'Could not complete verification at this time. Please try again.';
}

export default function VerifyCredentialPage() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const [searchParams] = useSearchParams();
  // Public credential IDs (SX-...) are case-insensitive on input; normalize so
  // the backend resolves them on the public verification path. Internal-style
  // IDs are only trimmed (never altered).
  const normalizedId = normalizeCredentialInput(credentialId ?? '');
  const initialHash = searchParams.get('hash') ?? undefined;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [hashBusy, setHashBusy] = useState(false);
  const [hashChecked, setHashChecked] = useState(false);

  const verify = useCallback(
    (documentHash?: string) => {
      if (!normalizedId) {
        setError('No credential ID provided.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      verifyRealCredential(normalizedId, documentHash)
        .then((data) => {
          setResult(data);
          setHashChecked(Boolean(documentHash));
        })
        .catch((err: unknown) => {
          setError(friendlyVerificationError(err));
        })
        .finally(() => setLoading(false));
    },
    [normalizedId],
  );

  useEffect(() => {
    verify(initialHash);
  }, [verify, initialHash]);

  async function runHashCheckFor(hash: string) {
    if (!normalizedId || !hash) return;
    setHashBusy(true);
    try {
      const data = await verifyRealCredential(normalizedId, hash);
      setResult(data);
      setHashChecked(true);
      setError(null);
    } catch (err: unknown) {
      setError(friendlyVerificationError(err));
    } finally {
      setHashBusy(false);
    }
  }

  async function runHashCheck() {
    await runHashCheckFor(hashInput.trim());
  }

  // Re-run the current verification flow after a transient failure.
  function retry() {
    if (hashBusy) return;
    const pendingHash = (initialHash ?? hashInput.trim()) || undefined;
    if (pendingHash) {
      void runHashCheckFor(pendingHash);
    } else {
      verify();
    }
  }

  async function shareResult() {
    const shareUrl = `${window.location.origin}/verify/${encodeURIComponent(normalizedId)}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'SecureX Verification Result',
          url: shareUrl,
        });
      } catch {
        // User dismissed the share sheet; fall through to clipboard.
        await window.navigator.clipboard.writeText(shareUrl);
      }
      return;
    }
    await window.navigator.clipboard.writeText(shareUrl);
  }

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="bg-neutral-50">
      {/* Header */}
      <section className="bg-neutral-950">
        <div className="mx-auto max-w-5xl px-4 py-12 pt-16 sm:px-6 lg:px-8">
          <Link
            to={ROUTES.VERIFY}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to verification
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
            Credential verification result
          </h1>
          {normalizedId && (
            <p className="mt-2 break-all font-mono text-sm text-neutral-300">
              {normalizedId}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 pb-16 sm:px-6 lg:px-8">
        {loading ? (
          <Card padding="lg" className="shadow-securex">
            <div
              role="status"
              aria-live="polite"
              aria-label="Verifying credential"
              className="flex flex-col items-center justify-center gap-4 py-16 text-center"
            >
              <Spinner size="lg" label="Verifying credential…" color="#4338ca" />
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Verifying credential
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  This verification result was generated by the SecureX verification service.
                </p>
              </div>
            </div>
          </Card>
        ) : error ? (
          <Card padding="lg" className="shadow-securex">
            <ErrorState
              icon={<Search aria-hidden="true" className="h-7 w-7" />}
              title="Could not complete verification"
              description={error}
              onRetry={retry}
              retryLabel="Try again"
            />
            <div className="flex flex-col justify-center gap-3 px-6 pb-8 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => window.history.back()}
              >
                Try another ID
              </Button>
              <Button href={ROUTES.VERIFY}>Verify another credential</Button>
            </div>
          </Card>
        ) : result ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-500">
                Verification performed by the SecureX verification engine.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Share2 className="h-4 w-4" />}
                  onClick={() => void shareResult()}
                >
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Printer className="h-4 w-4" />}
                  onClick={handlePrint}
                >
                  Print
                </Button>
              </div>
            </div>

            <RealVerificationResult result={result} />

            <Card padding="lg" className="shadow-securex">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-neutral-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
                  Document integrity check
                </h2>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                Paste the sha256 hash of the document you received to confirm it matches
                the version anchored on the SecureX ledger. A mismatch means the document
                has been tampered with.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  type="text"
                  placeholder="sha256 hash of the document (64 hex chars)"
                  value={hashInput}
                  onChange={(e) => {
                    setHashInput(e.target.value);
                    setError(null);
                  }}
                  className="flex-1 font-mono"
                  aria-label="Document hash"
                />
                <Button
                  variant="outline"
                  leftIcon={<Search className="h-4 w-4" />}
                  disabled={!hashInput.trim() || hashBusy}
                  onClick={() => void runHashCheck()}
                  className="sm:w-auto"
                >
                  {hashBusy ? 'Checking…' : hashChecked ? 'Re-check' : 'Check integrity'}
                </Button>
              </div>
            </Card>

            <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <ExternalLink className="h-3.5 w-3.5" />
                This result was generated live against the SecureX ledger.
              </div>
              <Button href={ROUTES.VERIFY} variant="ghost" size="sm">
                Verify another credential
              </Button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}