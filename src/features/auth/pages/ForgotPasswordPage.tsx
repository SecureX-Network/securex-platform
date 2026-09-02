import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { Alert } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { forgotPassword } from '@/services/api/authService';
import { AuthLayout } from '../components/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we will send you a secure link to reset your password."
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
      {submitted ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-trust-50 text-trust-600">
            <MailCheck aria-hidden="true" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Check your email</h2>
          <p className="mt-2 text-sm text-slate-500">
            If an account exists for{' '}
            <span className="font-medium text-slate-800">{email}</span>, we have sent
            a password reset link. Please check your inbox.
          </p>
          <Button
            variant="outline"
            size="md"
            className="mt-6"
            onClick={() => setSubmitted(false)}
          >
            Send another link
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
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
          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={loading}
            leftIcon={!loading ? <Mail className="h-4 w-4" /> : undefined}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}