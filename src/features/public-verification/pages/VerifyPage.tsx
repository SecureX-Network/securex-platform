import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Fingerprint,
  Info,
  QrCode,
  Search,
  ShieldCheck,
  Type,
  ScanLine,
} from 'lucide-react';
import { Button, Card, EmptyState, Input, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { getVerificationHistory } from '@/services/api/verificationService';
import type { VerificationHistory } from '@/types';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { formatDate } from '@/utils';
import { normalizeCredentialInput } from '@/utils/publicCredentialId';
import { QRScanner } from '@/features/public-verification/components/QRScanner';
import { resolveSecureXQrPayload } from '@/features/holder-admin/services/holderAdminService';
import { REAL_DEMO_PUBLIC_CREDENTIAL_IDS } from '@/features/holder-admin/services/holderOwnership';

// Curated sample PUBLIC credential IDs pulled from the authoritative real-chain
// seed (see backend scripts/demo-data.ts, surfaced via
// REAL_DEMO_PUBLIC_CREDENTIAL_IDS). Picked to showcase a realistic mix of
// verification outcomes. Public IDs (SX-XXXX-XXXX-XXXX) are what the verifier
// enters — never the internal sxu-* credential IDs.
const SAMPLE_INDEXES = [0, 2, 5, 6];
const SAMPLE_IDS = SAMPLE_INDEXES.map(
  (index) => REAL_DEMO_PUBLIC_CREDENTIAL_IDS[index],
).filter((id): id is string => Boolean(id));

// Manual entry uses the public-ID-aware normalizer: public IDs (sx-/SX-) are
// upper-cased so the backend resolves them on the public verification path.
function normalizeId(input: string): string {
  return normalizeCredentialInput(input);
}

export default function VerifyPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<VerificationHistory[] | null>(null);
  const [mode, setMode] = useState<'manual' | 'scan'>('manual');

  const historyEnabled = isAuthenticated && user !== null;

  useEffect(() => {
    let active = true;
    if (!historyEnabled || !user) return;
    getVerificationHistory(user.id).then((items) => {
      if (active) setHistory(items);
    });
    return () => {
      active = false;
    };
  }, [historyEnabled, user]);

  function runVerification(value: string) {
    const normalized = normalizeId(value);
    if (!normalized) {
      setError('Enter a credential ID to verify.');
      return;
    }
    setError(undefined);
    navigate(`/verify/${encodeURIComponent(normalized)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runVerification(query);
  }

  const handleQrDecoded = useCallback(
    (payload: string) => {
      setError('Verifying SecureX QR reference…');
      resolveSecureXQrPayload(payload)
        .then((res) => {
          if (!res.ok || !res.publicCredentialId) {
            setError(res.reason ?? 'This is not a valid SecureX QR reference.');
            return;
          }
          setError(undefined);
          navigate(`/verify/${encodeURIComponent(res.publicCredentialId)}`);
        })
        .catch(() => {
          setError('Could not authenticate this SecureX QR reference. Try again.');
        });
    },
    [navigate],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0b1f4d] to-[#1e1b4b]">
        <div className="relative mx-auto max-w-7xl px-4 py-24 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              <ShieldCheck className="h-3.5 w-3.5 text-trust-400" />
              Credential Verification
            </span>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Verify any credential instantly
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral-300">
              Enter a credential ID or scan a SecureX QR code to check verification
              details through SecureX.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Search / scanner card */}
        <Card
          padding="lg"
          className="rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/20 ring-1 ring-slate-900/5"
        >
          <div className="mb-5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === 'manual'
                  ? 'bg-white text-securex-700 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Type className="h-4 w-4" />
              Enter ID
            </button>
            <button
              type="button"
              onClick={() => setMode('scan')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === 'scan'
                  ? 'bg-white text-securex-700 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <ScanLine className="h-4 w-4" />
              Scan QR
            </button>
          </div>

          {mode === 'manual' ? (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="credential-query"
                  className="mb-1.5 block text-sm font-medium text-neutral-700"
                >
                  Credential ID
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="credential-query"
                    placeholder="e.g. SX-2F9C-A41B-8D7E"
                    size="lg"
                    leftIcon={<Search className="h-5 w-5" />}
                    value={query}
                    error={error}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (error) setError(undefined);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        runVerification(query);
                      }
                    }}
                    helperText="Enter the public credential ID (SX-XXXX-XXXX-XXXX) shown on the issued credential."
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!query.trim()}
                    className="min-w-[160px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold shadow-xl shadow-blue-600/30 transition-all duration-200 hover:-translate-y-1 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl hover:shadow-blue-600/40 sm:w-auto"
                  >
                    Verify
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-neutral-400" />
                  Try a sample:
                </span>
                {SAMPLE_IDS.map((sampleId) => (
                  <button
                    key={sampleId}
                    type="button"
                    onClick={() => {
                      setQuery(sampleId);
                      setError(undefined);
                      document.getElementById('credential-query')?.focus();
                    }}
                    className="rounded-full border border-blue-100 bg-blue-50/60 px-3.5 py-1.5 font-mono text-xs font-medium text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md"
                  >
                    {sampleId}
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-sm font-medium text-neutral-700">
                  SecureX QR scanner
                </p>
                <p className="mb-4 max-w-2xl text-sm text-neutral-500">
                  Point your camera at a SecureX QR code from a printed or digital
                  credential. The scanner only accepts SecureX QR codes and never
                  opens arbitrary links.
                </p>
                {error && (
                  <p
                    role="alert"
                    className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
              </div>
              <QRScanner onDecoded={handleQrDecoded} />
            </div>
          )}
        </Card>

        {/* Recent verifications */}
        {historyEnabled ? (
          <Card
            className="mt-6"
            title="Recent verifications"
            description="Your recent credential verification activity."
            bodyClassName="pt-2"
          >
            {history === null ? (
              <div className="flex justify-center py-10">
                <Spinner size="lg" label="Loading verifications…" color="#4338ca" />
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                icon={<Fingerprint className="h-8 w-8" />}
                title="No verifications yet"
                description="Credentials you verify will appear here."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {history.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                      <QrCode className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/verify/${encodeURIComponent(item.credentialId)}`}
                        className="block truncate text-sm font-medium text-neutral-900 hover:text-securex-700"
                      >
                        {item.credentialTitle}
                      </Link>
                      <div className="mt-0.5 truncate font-mono text-xs text-neutral-500">
                        {item.credentialId}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatDate(item.verifiedAt, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>{item.verifiedBy}</span>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                          {item.method}
                        </span>
                      </div>
                    </div>
                    <StatusIndicator status={item.result} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card className="mt-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Track your verifications
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Sign in to keep a history of every credential you verify.
                </p>
              </div>
              <Button href={ROUTES.LOGIN} variant="outline">
                Sign in
              </Button>
            </div>
          </Card>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            to={ROUTES.HOW_IT_WORKS}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-securex-600 hover:text-securex-700"
          >
            Learn how verification works
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
