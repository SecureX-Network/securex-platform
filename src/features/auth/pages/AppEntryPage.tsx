import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Building2,
  Fingerprint,
  IdCard,
  LayoutDashboard,
  Lock,
  Network,
  PlusCircle,
  ScanLine,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { LinkButton } from '@/components/ui/LinkButton';
import { PageLoader } from '@/components/shared/PageLoader';
import { dashboardFor } from '@/app/config/roleRouting';
import { useAuth } from '@/hooks/useAuth';

const CAPABILITIES = [
  {
    icon: PlusCircle,
    title: 'Issue',
    description:
      'Authorized institutions and issuers create and issue trusted digital credentials.',
  },
  {
    icon: Wallet,
    title: 'Hold',
    description:
      'Credential holders securely access, manage, and share their credentials.',
  },
  {
    icon: ScanLine,
    title: 'Verify',
    description:
      'Employers and verifiers confirm credential authenticity quickly.',
  },
  {
    icon: Settings2,
    title: 'Manage',
    description:
      'Organizations manage issuers, credentials, users, and workflows.',
  },
  {
    icon: ShieldAlert,
    title: 'Protect',
    description:
      'Security, auditability, tamper detection, and controlled access.',
  },
  {
    icon: Blocks,
    title: 'Explore',
    description:
      'Public network and blockchain information is inspectable via the explorer.',
  },
];

const ROLES = [
  {
    icon: Building2,
    title: 'Issuer / Institution',
    description: 'Issue and manage credentials.',
  },
  {
    icon: IdCard,
    title: 'Holder',
    description: 'Manage and share credentials.',
  },
  {
    icon: ScanLine,
    title: 'Employer',
    description: 'Verify credentials.',
  },
  {
    icon: UserCog,
    title: 'Administrator',
    description: 'Operate and secure the network.',
  },
];

const TRUST_POINTS = [
  {
    icon: Lock,
    title: 'Controlled access',
    description: 'Sign in is required for workspaces; services stay protected.',
  },
  {
    icon: Users,
    title: 'Role-based authorization',
    description: 'Access is scoped by role across the application.',
  },
  {
    icon: Fingerprint,
    title: 'Protected credential identity',
    description: 'Credentials carry a protected identity and public reference.',
  },
  {
    icon: BadgeCheck,
    title: 'Verification',
    description: 'Credential status is verified against the network.',
  },
  {
    icon: ScrollText,
    title: 'Auditability',
    description: 'Actions and events are auditable by administrators.',
  },
  {
    icon: LayoutDashboard,
    title: 'Security monitoring',
    description: 'Security center surfaces alerts and events.',
  },
  {
    icon: ShieldAlert,
    title: 'Fraud & tamper detection',
    description: 'Suspicious activity and tampering are flagged.',
  },
  {
    icon: Network,
    title: 'Network visibility',
    description: 'Blockchain and network data are public and inspectable.',
  },
];

const APP_FLOW = [
  { step: 'Issue', icon: PlusCircle },
  { step: 'Hold', icon: Wallet },
  { step: 'Share', icon: IdCard },
  { step: 'Verify', icon: ScanLine },
  { step: 'Trusted result', icon: ShieldCheck },
];

export default function AppEntryPage() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader label="Loading SecureX…" />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ===================== HEADER ===================== */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-trust-500 to-securex-600 text-white shadow-lg shadow-securex-500/20">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-black tracking-tight text-neutral-950">
                Secure<span className="text-securex-600">X</span>
              </span>
              <span className="rounded-md border border-securex-100 bg-securex-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-securex-700">
                WebApp
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Application">
            <Link
              to="/verify"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 transition-colors hover:text-securex-600"
            >
              <ScanLine aria-hidden="true" className="h-4 w-4" />
              Verify Credential
            </Link>
            <Link
              to="/explorer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 transition-colors hover:text-securex-600"
            >
              <Blocks aria-hidden="true" className="h-4 w-4" />
              Network Explorer
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LinkButton to="/auth/login" size="sm" ariaLabel="Sign in">
              Sign In
            </LinkButton>
          </div>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="securex-hero relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-trust-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-0 h-[28rem] w-[28rem] rounded-full bg-securex-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="securex-hero-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-trust-400" />
              SecureX Application
              <span className="h-1 w-1 rounded-full bg-trust-400" />
              Digital Credential Trust Network
            </span>

            <h1 className="securex-hero-title mt-8 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Digital credentials.
              <span className="block bg-gradient-to-r from-trust-400 via-emerald-400 to-securex-400 bg-clip-text text-transparent">
                Built for trust.
              </span>
            </h1>

            <p className="securex-hero-description mx-auto mt-6 max-w-2xl text-base leading-7 sm:text-lg">
              SecureX provides a controlled environment to issue, manage, hold,
              share, and verify credentials — with role-based workspaces, public
              verification, and network visibility.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <LinkButton
                to="/auth/login"
                size="lg"
                rightIcon={<ArrowRight aria-hidden="true" className="h-5 w-5" />}
                className="shadow-xl shadow-securex-500/20"
              >
                Sign In
              </LinkButton>
              <LinkButton
                to="/auth/register"
                size="lg"
                variant="outline"
                className="securex-outline-button"
              >
                Create Account
              </LinkButton>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-trust-400" />
                Role-based workspaces
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ScanLine aria-hidden="true" className="h-4 w-4 text-trust-400" />
                Public verification
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Blocks aria-hidden="true" className="h-4 w-4 text-trust-400" />
                Network explorer
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CAPABILITIES ===================== */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-securex-600">
              Application capabilities
            </p>
            <h2 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
              What the SecureX application does
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Everything you do with credentials — in one controlled workspace.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="group rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-securex-200 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-securex-50 to-trust-50 text-securex-600">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-neutral-900 uppercase tracking-wide">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {cap.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== ROLES ===================== */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-securex-600">
              Role-based experience
            </p>
            <h2 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
              One platform, adapted to your role
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              SecureX adapts the application experience to your role after you
              sign in.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-securex-600 text-white shadow-lg shadow-securex-600/20">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-neutral-900">
                    {role.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600">{role.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== HOW THE APP WORKS ===================== */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-securex-600">
              Application flow
            </p>
            <h2 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
              How the application works
            </h2>
          </div>

          <ol className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {APP_FLOW.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.step} className="relative flex lg:flex-col">
                  <div className="flex items-center gap-4 lg:flex-col lg:text-center">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-securex-100 bg-gradient-to-br from-securex-50 to-trust-50 text-securex-600">
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                        Step {index + 1}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-neutral-900">
                        {step.step}
                      </p>
                    </div>
                  </div>
                  {index < APP_FLOW.length - 1 && (
                    <ArrowRight
                      aria-hidden="true"
                      className="absolute -bottom-5 left-6 hidden h-4 w-4 rotate-90 text-neutral-300 lg:block lg:-right-3 lg:bottom-auto lg:top-1/2 lg:left-auto"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ===================== TRUST & SECURITY ===================== */}
      <section className="relative overflow-hidden bg-neutral-950 py-20 lg:py-24">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-securex-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-trust-400">
              Trust & security
            </p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              Built on controlled trust
            </h2>
            <p className="mt-4 text-lg text-neutral-300">
              Security mechanisms are part of the application, not an add-on.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <Icon aria-hidden="true" className="h-6 w-6 text-trust-400" />
                  <h3 className="mt-4 text-sm font-bold text-white">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    {point.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== PUBLIC ACCESS ===================== */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-securex-600">
              Public utilities
            </p>
            <h2 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
              Use the network without signing in
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              These tools are open to everyone. No account required.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-securex-600 text-white shadow-lg shadow-securex-600/20">
                <ScanLine aria-hidden="true" className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-neutral-900">
                Verify a Credential
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Check any credential by ID or by scanning a SecureX QR code.
              </p>
              <LinkButton
                to="/verify"
                variant="outline"
                className="mt-6"
                rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                Verify a Credential
              </LinkButton>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-securex-600 text-white shadow-lg shadow-securex-600/20">
                <Blocks aria-hidden="true" className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-neutral-900">
                Explore the Network
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Inspect blocks, transactions, validators, and network status.
              </p>
              <LinkButton
                to="/explorer"
                variant="outline"
                className="mt-6"
                rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                Explore the Network
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} SecureX. SecureX WebApp.
          </p>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <a
              href="https://securex.sp-net.in"
              className="transition-colors hover:text-securex-600"
            >
              Public website
            </a>
            <Link
              to="/verify"
              className="transition-colors hover:text-securex-600"
            >
              Verify
            </Link>
            <Link
              to="/explorer"
              className="transition-colors hover:text-securex-600"
            >
              Explorer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}