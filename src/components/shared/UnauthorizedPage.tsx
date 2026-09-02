import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 text-danger-500">
          <ShieldX className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-neutral-900">
          401 · Unauthorized
        </h1>
        <p className="mt-2 text-neutral-500">
          You don’t have permission to access this area. Contact your
          administrator if you believe this is a mistake.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-securex-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-securex-700"
          >
            Back to Home
          </Link>
          <Link
            to="/auth/login"
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}