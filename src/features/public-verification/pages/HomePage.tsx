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
    <div className="overflow-hidden bg-white">

      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="securex-hero relative overflow-hidden">

        {/* Background Effects */}
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-trust-500/20 blur-3xl" />

        <div className="pointer-events-none absolute -right-40 top-0 h-[28rem] w-[28rem] rounded-full bg-securex-500/20 blur-3xl" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_55%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">

          {/* HERO CONTENT */}
          <div className="mx-auto max-w-4xl text-center">

            {/* Badge */}
            <div className="securex-hero-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur">

              <ShieldCheck className="h-4 w-4 text-trust-500" />

              Blockchain-Powered Trust Network

              <span className="h-1 w-1 rounded-full bg-trust-500" />

              SecureX

            </div>

            {/* Heading */}
            <h1 className="securex-hero-title mt-8 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">

              Blockchain-Powered

              <span className="block bg-gradient-to-r from-trust-500 via-emerald-500 to-securex-500 bg-clip-text text-transparent">
                Digital Credential Trust Network
              </span>

            </h1>

            {/* Description */}
            <p className="securex-hero-description mx-auto mt-7 max-w-3xl text-base leading-7 sm:text-lg sm:leading-8">

              Issue, store, and verify credentials with cryptographic security.
              SecureX connects institutions, holders, and employers through a
              tamper-proof distributed ledger.

            </p>

            {/* Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

              {/* Verify */}
              <Button
                href="/verify"
                size="lg"
                rightIcon={<ArrowRight className="h-5 w-5" />}
                className="shadow-xl shadow-securex-500/20 transition-all hover:-translate-y-1"
              >
                Verify Credential
              </Button>

              {/* Get Started */}
              <Button
                href="/auth/register"
                size="lg"
                variant="outline"
                className="securex-outline-button"
              >
                Get Started
              </Button>

            </div>

          </div>


          {/* =====================================================
              SHIELD VISUAL
          ===================================================== */}
          <div className="mx-auto mt-20 max-w-3xl">

            <div className="securex-hero-card relative rounded-[2rem] p-10 shadow-2xl backdrop-blur-xl sm:p-14">

              {/* Card Glow */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-trust-500/5 via-transparent to-securex-500/10" />

              <div className="relative flex items-center justify-center">

                <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">

                  {/* Outer Glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-trust-500/30 to-securex-500/30 blur-3xl" />

                  {/* Dashed Circle */}
                  <div className="absolute inset-4 rounded-full border border-dashed border-neutral-300 dark:border-white/20" />

                  {/* Inner Circle */}
                  <div className="absolute inset-8 rounded-full border border-neutral-200 dark:border-white/10" />

                  {/* Shield */}
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] bg-gradient-to-br from-trust-400 to-securex-600 shadow-2xl shadow-trust-500/30 transition-all duration-500 hover:scale-110 hover:rotate-2 sm:h-44 sm:w-44">

                    <Shield className="h-20 w-20 text-white sm:h-24 sm:w-24" />

                  </div>


                  {/* Verified Icon */}
                  <div className="absolute right-0 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-trust-600 shadow-xl">

                    <CheckCircle2 className="h-6 w-6" />

                  </div>


                  {/* Lock Icon */}
                  <div className="securex-lock-badge absolute bottom-7 left-0 flex h-11 w-11 items-center justify-center rounded-full shadow-xl">

                    <Lock className="h-5 w-5" />

                  </div>

                </div>

              </div>


              {/* Security Tags */}
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">

                <span className="securex-hero-tag rounded-full px-4 py-2 text-xs font-medium">
                  Cryptographically Secure
                </span>

                <span className="securex-hero-tag rounded-full px-4 py-2 text-xs font-medium">
                  Tamper Resistant
                </span>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          STATS
      ===================================================== */}
      <section className="border-b border-neutral-200 bg-white">

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-sm font-bold uppercase tracking-widest text-securex-600">
              Trusted Network
            </p>

            <h2 className="mt-3 text-2xl font-black text-neutral-900 sm:text-3xl">
              Built for digital trust at scale
            </h2>

          </div>


          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">

            {STATS.map((stat) => (

              <div
                key={stat.label}
                className="group rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-securex-200 hover:shadow-xl"
              >

                <div className="text-4xl font-black text-securex-600">
                  {stat.value}
                </div>

                <div className="mt-2 text-sm font-semibold text-neutral-700">
                  {stat.label}
                </div>

                <div className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  Demo value
                </div>

              </div>

            ))}

          </div>

        </div>

      </section>


      {/* =====================================================
          FEATURES
      ===================================================== */}
      <section className="relative bg-neutral-50 py-24 lg:py-28">

        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-securex-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-sm font-bold uppercase tracking-widest text-securex-600">
              Why SecureX
            </p>

            <h2 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
              A new standard for digital trust
            </h2>

            <p className="mt-5 text-lg leading-8 text-neutral-600">
              SecureX makes credentials portable, secure, and instantly
              verifiable across the entire ecosystem.
            </p>

          </div>


          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

            {FEATURES.map((feature) => {

              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-securex-200 hover:shadow-2xl"
                >

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-securex-50 to-trust-50 text-securex-600 transition-transform duration-300 group-hover:scale-110">

                    <Icon className="h-7 w-7" />

                  </div>


                  <h3 className="mt-6 text-lg font-bold text-neutral-900">
                    {feature.title}
                  </h3>


                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    {feature.description}
                  </p>


                  <ArrowRight className="mt-6 h-5 w-5 text-securex-500 transition-transform duration-300 group-hover:translate-x-1" />

                </div>
              );

            })}

          </div>

        </div>

      </section>


      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}
      <section className="bg-white py-24 lg:py-28">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-sm font-bold uppercase tracking-widest text-securex-600">
              Simple Process
            </p>

            <h2 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
              How it works
            </h2>

            <p className="mt-5 text-lg text-neutral-600">
              A simple three-step flow that turns credentials into
              verifiable, portable proof.
            </p>

          </div>


          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">

            {STEPS.map((step) => {

              const Icon = step.icon;

              return (
                <div
                  key={step.step}
                  className="group relative rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-securex-200 hover:shadow-xl"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-securex-600 text-white shadow-lg shadow-securex-600/20">

                      <Icon className="h-7 w-7" />

                    </div>


                    <span className="text-5xl font-black text-neutral-100 transition-colors group-hover:text-securex-100">
                      {step.step}
                    </span>

                  </div>


                  <h3 className="mt-7 text-xl font-bold text-neutral-900">
                    {step.title}
                  </h3>


                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    {step.description}
                  </p>

                </div>
              );

            })}

          </div>


          <div className="mt-10 text-center">

            <Button
              href="/how-it-works"
              variant="outline"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Learn more
            </Button>

          </div>

        </div>

      </section>


      {/* =====================================================
          FINAL CTA
      ===================================================== */}
      <section className="relative overflow-hidden bg-neutral-950 py-24">

        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-securex-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">

            <ShieldCheck className="h-8 w-8 text-trust-400" />

          </div>


          <h2 className="mt-7 text-3xl font-black text-white sm:text-5xl">
            Ready to build a world without credential fraud?
          </h2>


          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-300">
            Join the network of institutions, holders, and employers
            modernizing how trust is established.
          </p>


          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

            <Button
              href="/auth/register"
              size="lg"
              className="shadow-xl shadow-securex-500/20 transition-all hover:-translate-y-1"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>


            <Button
              href="/contact"
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Contact Sales
            </Button>

          </div>

        </div>

      </section>

    </div>
  );
}