import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShieldCheck, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Contact', to: '/contact' },
  { label: 'Verify', to: '/verify' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-securex bg-securex-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight text-neutral-900">
            Secure<span className="text-securex-600">X</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-securex-50 text-securex-700'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/auth/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Sign In
          </Link>
          <Link
            to="/auth/register"
            className="rounded-lg bg-securex-600 px-4 py-2 text-sm font-semibold text-white shadow-securex transition-colors hover:bg-securex-700"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-securex-50 text-securex-700'
                      : 'text-neutral-700'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/auth/login"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-center text-sm font-semibold text-neutral-700"
            >
              Sign In
            </Link>
            <Link
              to="/auth/register"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-securex-600 px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}