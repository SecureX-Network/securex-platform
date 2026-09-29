import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, Mail } from 'lucide-react';
import { Alert } from '@/components/ui';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Input } from '@/components/ui';
import { AUTH_USER_KEY } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { dashboardFor } from '@/app/config/roleRouting';
import type { User } from '@/types';
import { AuthLayout } from '../components/AuthLayout';

/**
 * DEMO accounts offered on the sign-in page. Passwords are deliberately NOT
 * rendered: the "Use" button fills both fields, so a recorded demo never has a
 * plaintext password on screen. Every account here exists in the seeded mock
 * dataset and the backend seed, so the same credentials work in DEMO and REAL.
 */
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@securex.io', password: 'Password123!' },
  { role: 'Holder', email: 'emily.rodriguez@example.com', password: 'Password123!' },
  { role: 'Employer', email: 'marcus.johnson@acme.com', password: 'Password123!' },
  { role: 'Institution', email: 's.chen@stanford.edu', password: 'Password123!' },
  { role: 'Issuer', email: 'cs-graduation@stanford.edu', password: 'Password123!' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from || undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      const raw = localStorage.getItem(AUTH_USER_KEY);
      const user = raw ? (JSON.parse(raw) as User) : null;
      if (!user) throw new Error('Unable to determine account role.');
      const target = from && !from.startsWith('/auth') ? from : dashboardFor(user.role);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(emailValue: string, passwordValue: string) {
    setEmail(emailValue);
    setPassword(passwordValue);
    setError(null);
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your SecureX workspace."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/auth/register" className="font-medium text-securex-700 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail aria-hidden="true" className="h-4 w-4" />}
          disabled={loading}
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700">
              Password
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-sm font-medium text-securex-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<KeyRound aria-hidden="true" className="h-4 w-4" />}
            disabled={loading}
          />
        </div>

        <Checkbox
          label="Remember me"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={loading}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={loading}
          leftIcon={!loading ? <LogIn className="h-4 w-4" /> : undefined}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Demo accounts
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Select a role to fill the form. Institution and Issuer are scoped to
          Stanford University.
        </p>
        <ul className="mt-3 space-y-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <li
              key={account.role}
              className="flex items-center justify-between gap-3 text-sm text-slate-600"
            >
              <span className="min-w-0">
                <span className="font-medium text-slate-800">{account.role}:</span>{' '}
                <span className="truncate font-mono text-xs">{account.email}</span>
              </span>
              <button
                type="button"
                onClick={() => fillDemo(account.email, account.password)}
                className="shrink-0 text-xs font-medium text-securex-700 hover:underline"
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AuthLayout>
  );
}