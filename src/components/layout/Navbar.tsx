import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Contact', href: '/contact' },
  { label: 'Verify', href: '/verify' },
];

export  function Navbar() {
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('securex-theme');
    const isDark = savedTheme === 'dark';

    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark-theme', isDark);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !darkMode;

    setDarkMode(nextTheme);
    document.documentElement.classList.toggle('dark-theme', nextTheme);

    localStorage.setItem(
      'securex-theme',
      nextTheme ? 'dark' : 'light'
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-trust-400 to-securex-600 shadow-lg shadow-securex-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>

          <div className="hidden sm:block">
            <div className="text-xl font-black tracking-tight text-neutral-950">
              Secure<span className="text-securex-600">X</span>
            </div>

            <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400">
              Trusted Credentials
            </div>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-1 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-1.5 md:flex">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.href;

            return (
              <Link
                key={link.href}
                to={link.href}
                className={`relative rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 ${
                  active
                    ? 'border border-neutral-300 bg-white text-securex-600 shadow-sm'
                    : 'text-neutral-600 hover:bg-white/80 hover:text-neutral-950'
                }`}
              >
                {link.label}

                {link.label === 'Verify' && (
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-securex-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className="hidden items-center gap-4 md:flex">

          {/* THEME TOGGLE */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-700 shadow-sm transition-all duration-300 hover:scale-105 hover:border-securex-300 hover:text-securex-600"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* PREMIUM SIGN IN */}
          <Link
            to="/auth/login"
            className="group relative flex h-12 items-center justify-center overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 px-6 font-bold text-amber-900 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.45)]"
          >
            {/* SHINE EFFECT */}
            <span className="absolute inset-y-0 -left-20 w-12 rotate-12 bg-white/70 blur-sm transition-all duration-700 group-hover:left-[120%]" />

            <span className="relative z-10">
              Sign In
            </span>
          </Link>

          {/* GET STARTED */}
          <Button
            href="/auth/register"
            size="lg"
            rightIcon={<ArrowRight className="h-5 w-5" />}
            className="shadow-xl shadow-securex-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-securex-500/40"
          >
            Get Started
          </Button>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-5 md:hidden">

          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.href;

              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-3 font-semibold transition ${
                    active
                      ? 'bg-securex-50 text-securex-600'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex flex-col gap-3 border-t border-neutral-200 pt-4">

            {/* MOBILE THEME */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 font-semibold text-neutral-700"
            >
              {darkMode ? (
                <>
                  <Sun className="h-5 w-5" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5" />
                  Dark Mode
                </>
              )}
            </button>

            {/* MOBILE SIGN IN */}
            <Link
              to="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="flex h-12 items-center justify-center rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 font-bold text-amber-900 shadow-[0_0_18px_rgba(245,158,11,0.25)]"
            >
              Sign In
            </Link>

            {/* MOBILE GET STARTED */}
            <Button
              href="/auth/register"
              size="lg"
              rightIcon={<ArrowRight className="h-5 w-5" />}
              className="w-full"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}