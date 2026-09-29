import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Alert, Button, Card, Input, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { QRScanner } from '@/features/public-verification/components/QRScanner';
import { RealVerificationResult } from '@/features/public-verification/components/RealVerificationResult';
import { verifyPublicCredential } from '@/features/public-verification/services/publicVerificationService';
import { roleLabel } from '@/app/config/roleRouting';
import { useAuth } from '@/hooks/useAuth';
import {
  type VerificationView,
  resolveSecureXQrPayload,
} from '@/features/holder-admin/services/holderAdminService';

const VERIFY_ERROR = 'Unable to verify this credential. Please try again.';

const STEPS = [
  'Enter the credential ID from the holder’s digital wallet.',
  'SecureX looks up the credential record and reports the status the platform holds. Blockchain and signature checks are not performed and are reported as such.',
  'Receive the result, with each check shown as verified, not verified, or not performed.',
];

export default function VerifyCredentialFlowPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [credentialId, setCredentialId] = useState(searchParams.get('credentialId') ?? '');
  const [result, setResult] = useState<VerificationView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVerify = useCallback(
    async (id?: string) => {
      const target = (id ?? credentialId).trim();
      if (!target) {
        setError('Please enter a credential ID to verify.');
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        setResult(await verifyPublicCredential(target));
      } catch {
        setError(VERIFY_ERROR);
      } finally {
        setLoading(false);
      }
    },
    [credentialId],
  );

  // A scanned SecureX QR carries an opaque token, not a credential ID, so it is
  // resolved through the platform first and only then verified.
  const handleQrDecoded = useCallback(
    async (payload: string) => {
      setScanError(null);
      try {
        const resolved = await resolveSecureXQrPayload(payload);
        if (!resolved.ok || !resolved.publicCredentialId) {
          setScanError(resolved.reason ?? 'This is not a valid SecureX QR reference.');
          return;
        }
        setScanOpen(false);
        setCredentialId(resolved.publicCredentialId);
        await handleVerify(resolved.publicCredentialId);
      } catch {
        setScanError('Could not authenticate this SecureX QR reference. Try again.');
      }
    },
    [handleVerify],
  );

  // A deep link (for example from a shared credential page) carries the ID in
  // the query string, so verification starts without a second click.
  useEffect(() => {
    const initial = searchParams.get('credentialId');
    if (!initial) return;
    setCredentialId(initial);
    let cancelled = false;
    setLoading(true);
    verifyPublicCredential(initial)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(VERIFY_ERROR);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const isWarning =
    result?.status === 'SUSPICIOUS' || result?.status === 'SUSPENDED';
  const isInvalid =
    result != null &&
    (result.status === 'REVOKED' ||
      result.status === 'TAMPERED' ||
      result.status === 'INVALID' ||
      result.status === 'NOT_FOUND');

  const reset = useCallback(() => {
    setResult(null);
    setCredentialId('');
    setError(null);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify a Credential"
        subtitle={`Confirm the platform record for any SecureX credential. Available to every ${roleLabel(user?.role ?? 'PUBLIC').toLowerCase()} in the workspace.`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Enter Credential ID" padding="lg" className="h-fit lg:col-span-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify();
            }}
            className="space-y-4"
          >
            <Input
              ref={inputRef}
              label="Credential ID"
              placeholder="e.g. SX-2F9C-A41B-8D7E"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="font-mono"
              aria-label="Credential ID to verify"
            />
            <Button
              type="submit"
              isLoading={loading}
              disabled={!credentialId.trim()}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Verify Credential
            </Button>
          </form>

          <div className="mt-6 border-t border-neutral-100 pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-700">
              <QrCode className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              Scan QR Code
            </p>
            {scanError && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {scanError}
              </p>
            )}
            {scanOpen ? (
              <div className="space-y-3">
                <QRScanner
                  onDecoded={handleQrDecoded}
                  onSwitchToManual={() => {
                    setScanOpen(false);
                    setScanError(null);
                    inputRef.current?.focus();
                  }}
                />
                <p className="text-xs text-neutral-400">
                  The scanner only accepts SecureX QR codes. The credential is
                  resolved through the platform, so the QR never exposes the
                  public credential ID.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-6">
                <ScanLine className="h-7 w-7 text-neutral-300" aria-hidden="true" />
                <p className="text-center text-xs text-neutral-400">
                  Scan a SecureX QR code from a holder&apos;s wallet to verify
                  without typing an ID.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Camera className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => {
                    setScanError(null);
                    setScanOpen(true);
                  }}
                >
                  Scan with camera
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="How it works" padding="lg" className="h-fit">
            <ol className="space-y-4 text-sm text-neutral-600">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-securex-50 text-xs font-semibold text-securex-600"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Need a public link?" padding="lg" className="h-fit">
            <p className="text-sm text-neutral-600">
              Anyone can check a credential without an account. Share the public
              verification link instead of your workspace.
            </p>
            <Link
              to="/verify"
              className="mt-3 inline-block text-sm font-semibold text-securex-600 hover:text-securex-700"
            >
              Open public verification
            </Link>
          </Card>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Verification error">
          {error}
        </Alert>
      )}

      {isWarning && result && !isInvalid && (
        <Alert
          variant="warning"
          title="Credential flagged by the issuer"
          icon={<AlertTriangle className="h-5 w-5" />}
        >
          This credential is suspended or flagged as suspicious by the issuer.
          Review it carefully before relying on it.
        </Alert>
      )}

      {isInvalid && (
        <Alert
          variant="error"
          title="Credential not valid"
          icon={<ShieldAlert className="h-5 w-5" />}
        >
          This credential is not in a valid state and should not be accepted.
        </Alert>
      )}

      {loading && (
        <Card padding="lg">
          <div className="flex flex-col items-center py-8 text-center">
            <Spinner size="lg" label="Verifying credential" />
            <p className="mt-4 text-sm font-medium text-neutral-700">
              Verifying credential against the SecureX Platform record…
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Looking up the credential record and its authoritative status
            </p>
          </div>
        </Card>
      )}

      {result && !loading && (
        <div>
          <RealVerificationResult result={result} />
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              Keep this result
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              Verify Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
