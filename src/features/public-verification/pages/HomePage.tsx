import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  CheckCircle2,
  Fingerprint,
  Globe,
  Lock,
  QrCode,
  Shield,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui';

const STATS = [
  { value: '10,000+', label: 'Credentials Issued' },
  { value: '50+', label: 'Institutions' },
  { value: '100,000+', label: 'Verifications' },
];

const FEATURES = [
  {
    icon: Fingerprint,
    title: 'Tamper-Proof',
    description:
      'Every credential is cryptographically signed and anchored to the ledger. Any alteration is immediately detectable.',
  },
  {
    icon: Zap,
    title: 'Instant Verification',
    description:
      'Validate any credential in seconds without contacting the issuing institution or waiting for manual checks.',
  },
  {
    icon: Blocks,
    title: 'Blockchain Secured',
    description:
      'A distributed ledger provides an immutable, auditable record of every credential issue and verification event.',
  },
  {
    icon: Globe,
    title: 'Universal Access',
    description:
      'Open, standards-based platform that works across institutions, employers, borders, and industries.',
  },
];

const STEPS = [
  {
    icon: BadgeCheck,
    step: '01',
    title: 'Issue',
    description:
      'Institutions issue digitally signed credentials to their graduates and members directly onto the network.',
  },
  {
    icon: Lock,
    step: '02',
    title: 'Store',
    description:
      'Holders keep their credentials in a secure digital wallet, with full control over what they share.',
  },
  {
    icon: QrCode,
    step: '03',
    title: 'Verify',
    description:
      'Employers and institutions confirm authenticity instantly with a single scan or search.',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-neutral-950">
  <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-trust-500/10 blur-3xl" />
  <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-securex-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(80,70,229,0.15),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              <ShieldCheck className="h-3.5 w-3.5 text-trust-400" />
              Blockchain-Powered Trust Network
            </span>
            <h1 className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Blockchain-Powered Digital{' '}
              <span className="bg-gradient-to-r from-trust-400 to-securex-400 bg-clip-text text-transparent">
                Credential Trust Network
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8">
              Issue, store, and verify credentials with cryptographic security.
              SecureX connects institutions, holders, and employers through a
              tamper-proof distributed ledger — building trust in every
              credential.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/verify" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Verify Credential
              </Button>
              <Button
                href="/auth/register"
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Get Started
              </Button>
            </div>
          </div>

          {/* Visual shield */}
          <div className="mx-auto mt-16 max-w-2xl">
            <div className="relative flex items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-10 shadow-2xl shadow-black/20 backdrop-blur-md transition-transform duration-500 hover:scale-[1.01]">
              <div className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-trust-500/30 to-securex-500/30 blur-2xl" />
                <div className="absolute inset-4 rounded-full border border-dashed border-white/20" />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-trust-500 to-securex-600 shadow-2xl shadow-trust-500/20 transition-transform duration-500 hover:rotate-2 hover:scale-105 sm:h-40 sm:w-40">
                  <Shield className="h-16 w-16 text-white sm:h-20 sm:w-20" />
                </div>
                <span className="absolute -right-1 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white text-trust-600 shadow-lg">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <span className="absolute -left-2 bottom-8 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg">
                  <Lock className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-neutral-400">
            Trusted by leading institutions
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center"
              >
                <div className="text-4xl font-extrabold text-securex-600">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm font-medium text-neutral-600">
                  {stat.label}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-wide text-neutral-400">
                  Demo value
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
              A new standard for digital trust
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              SecureX makes credentials portable, secure, and instantly
              verifiable across the entire ecosystem.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
               className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-securex-50 text-securex-600">
                  <feature.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works preview */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              A simple three-step flow that turns credentials into
              verifiable, portable proof.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.step} className="relative rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-securex-600 text-white">
                    <step.icon className="h-6 w-6" />
                  </span>
                  <span className="text-4xl font-extrabold text-neutral-200">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-neutral-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button href="/how-it-works" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Learn more
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-950 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to build a world without credential fraud?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-300">
            Join the network of institutions, holders, and employers
            modernizing how trust is established.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/auth/register" size="lg">
              Get Started Free
            </Button>
            <Button
              href="/contact"
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
