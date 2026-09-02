import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, KeyRound, Mail, User } from 'lucide-react';
import { Alert } from '@/components/ui';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { AuthLayout } from '../components/AuthLayout';

const ROLE_OPTIONS = [
  { label: 'Credential Holder', value: 'HOLDER' },
  { label: 'Institution', value: 'INSTITUTION' },
  { label: 'Employer', value: 'EMPLOYER' },
];

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  terms?: string;
}

export default function RegisterPage() {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('HOLDER');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function passwordStrength(pw: string): {
    score: number;
    label: string;
    color: string;
  } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak', color: 'bg-danger-500' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-warning-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-trust-500' };
    return { score, label: 'Strong', color: 'bg-trust-600' };
  }

  const strength = useMemo(() => passwordStrength(password), [password]);

  function validate(): boolean {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Full name is required.';
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 8)
      next.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password)
      next.confirmPassword = 'Passwords do not match.';
    if (!acceptTerms) next.terms = 'You must accept the terms of service.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      // No navigation requirement; AuthProvider persists the session.
      window.location.assign('/');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create account.');
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join the SecureX trust network as a holder, institution, or employer."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-securex-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {formError && (
        <Alert variant="error" className="mb-4">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full Name"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          leftIcon={<User aria-hidden="true" className="h-4 w-4" />}
          disabled={loading}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<Mail aria-hidden="true" className="h-4 w-4" />}
          disabled={loading}
        />
        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            leftIcon={<KeyRound aria-hidden="true" className="h-4 w-4" />}
            disabled={loading}
          />
          {password && (
            <div className="mt-2">
              <div className="flex h-1.5 w-full gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={
                      i <= strength.score
                        ? `flex-1 rounded-full ${strength.color}`
                        : 'flex-1 rounded-full bg-neutral-200'
                    }
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Password strength:{' '}
                <span className="font-medium text-neutral-800">{strength.label}</span>
              </p>
            </div>
          )}
        </div>
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          leftIcon={<KeyRound aria-hidden="true" className="h-4 w-4" />}
          disabled={loading}
        />
        <div>
          <label htmlFor="register-role" className="mb-1.5 block text-sm font-medium text-neutral-700">
            Account Type
          </label>
          <Select
            id="register-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={ROLE_OPTIONS}
            error={errors.role}
            disabled={loading}
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            label={
              <span>
                I agree to the{' '}
                <a href="/" className="font-medium text-securex-700 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/" className="font-medium text-securex-700 hover:underline">
                  Privacy Policy
                </a>
              </span>
            }
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            disabled={loading}
          />
        </div>
        {errors.terms && (
          <p className="-mt-2 text-xs text-danger-600">{errors.terms}</p>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={loading}
          leftIcon={!loading ? <Building2 className="h-4 w-4" /> : undefined}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}