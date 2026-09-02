import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  Input,
  Spinner,
  VerificationResult,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { verifyCredential } from '@/services/api/verificationService';
import type { VerificationResult as VerificationResultData } from '@/types';

export default function EmployerVerifyPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [credentialId, setCredentialId] = useState(
    searchParams.get('credentialId') ?? '',
  );
  const [result, setResult] = useState<VerificationResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const data = await verifyCredential(target);
        setResult({ ...data, verifiedBy: user?.name ?? 'Employer' });
      } catch {
        setError('Unable to verify this credential. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [credentialId, user],
  );

  useEffect(() => {
    const initial = searchParams.get('credentialId');
    if (!initial) return;
    setCredentialId(initial);
    let cancelled = false;
    setLoading(true);
    verifyCredential(initial)
      .then((data) => {
        if (!cancelled) {
          setResult({ ...data, verifiedBy: user?.name ?? 'Employer' });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to verify this credential. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, user?.name]);

  const isWarning = result
    ? result.status === 'SUSPICIOUS' ||
      result.status === 'SUSPENDED' ||
      result.credential?.status === 'SUSPICIOUS'
    : false;
  const isInvalid =
    result &&
    (result.status === 'REVOKED' ||
      result.status === 'TAMPERED' ||
      result.status === 'INVALID' ||
      result.status === 'NOT_FOUND');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">
          Verify a Candidate Credential
        </h1>
        <p className="text-sm text-neutral-500">
          Check any candidate credential against the SecureX ledger and receive
          an instant risk assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Enter Credential ID" padding="lg" className="lg:col-span-2 h-fit">
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
              <QrCode className="h-4 w-4 text-neutral-400" />
              Scan QR Code
            </p>
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/60">
              <ScanLine className="h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-xs text-neutral-400">
                QR scanner integration coming soon
              </p>
            </div>
          </div>
        </Card>

        <Card title="How it works" padding="lg" className="h-fit">
          <ol className="space-y-4 text-sm text-neutral-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-securex-50 text-xs font-semibold text-securex-600">
                1
              </span>
              Enter the credential ID from the candidate's digital wallet.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-securex-50 text-xs font-semibold text-securex-600">
                2
              </span>
              SecureX checks the ledger record, digital signature, and fraud
              engine.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-securex-50 text-xs font-semibold text-securex-600">
                3
              </span>
              Receive an instant risk assessment with full proof details.
            </li>
          </ol>
        </Card>
      </div>

      {error && (
        <Alert variant="error" title="Verification error">
          {error}
        </Alert>
      )}

      {isWarning && result && !isInvalid && (
        <Alert
          variant="warning"
          title="Suspicious credential"
          icon={<AlertTriangle className="h-5 w-5" />}
        >
          This credential has been flagged by the fraud engine. Review the risk
          assessment carefully before making a hiring decision.
        </Alert>
      )}

      {isInvalid && (
        <Alert
          variant="error"
          title="Credential not valid" icon={<ShieldAlert className="h-5 w-5" />}>
          This credential is not in a valid state and should not be accepted.
        </Alert>
      )}

      {loading && (
        <Card padding="lg">
          <div className="flex flex-col items-center py-8 text-center">
            <Spinner size="lg" color="#4f46e5" />
            <p className="mt-4 text-sm font-medium text-neutral-700">
              Verifying credential against the SecureX ledger...
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Checking blockchain proof, signature, and fraud signals
            </p>
          </div>
        </Card>
      )}

      {result && !loading && (
        <div>
          <VerificationResult result={result} />
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResult(null);
                setCredentialId('');
                setError(null);
                inputRef.current?.focus();
              }}
            >
              Verify Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}