import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui';
import { Button } from '@/components/ui';
import { verifyMFA } from '@/services/api/authService';
import { AuthLayout } from '../components/AuthLayout';

const DIGIT_COUNT = 6;

export default function MfaPage() {
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    const next = Array(DIGIT_COUNT).fill('');
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
  }

  const code = digits.join('');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length !== DIGIT_COUNT) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyMFA(code);
      if (!result.verified) {
        setError('Incorrect code. Please try again.');
        return;
      }
      window.location.assign('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Two-factor authentication"
      subtitle="Enter the six-digit code from your authenticator app to complete sign-in."
      footer={
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 font-medium text-securex-700 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to login
        </Link>
      }
    >
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label
            htmlFor="mfa-0"
            className="mb-2 block text-center text-sm font-medium text-neutral-700"
          >
            Verification code
          </label>
          <div className="flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                id={index === 0 ? 'mfa-0' : undefined}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={loading}
                aria-label={`Digit ${index + 1}`}
                className="h-14 w-11 rounded-xl border border-neutral-300 bg-white text-center text-xl font-semibold text-neutral-900 transition-colors focus:border-securex-500 focus:outline-none focus:ring-2 focus:ring-securex-100 disabled:bg-neutral-100"
              />
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={loading}>
          {loading ? 'Verifying…' : 'Verify'}
        </Button>

        <div className="text-center">
          <span className="text-sm text-slate-500">Didn&apos;t receive a code? </span>
          <button
            type="button"
            disabled={loading}
            className="text-sm font-medium text-securex-700 hover:underline disabled:opacity-60"
          >
            Resend code
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-securex-600" />
          Secured with two-factor authentication
        </div>
      </form>
    </AuthLayout>
  );
}