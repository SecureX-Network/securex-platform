import {
  Award,
  Compass,
  Eye,
  Globe,
  HeartHandshake,
  ShieldCheck,
  Workflow,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react';
import { Button } from '@/components/ui';

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Trust by default',
    description:
      'We believe trust should be earned through cryptography and verifiable proof, not assumptions or paperwork.',
  },
  {
    icon: Eye,
    title: 'Transparency',
    description:
      'A publicly auditable ledger means anyone can verify the authenticity of a credential at any time.',
  },
  {
    icon: HeartHandshake,
    title: 'Holder ownership',
    description:
      'Credentials belong to the people who earn them. Holders decide what to share, when, and with whom.',
  },
  {
    icon: Globe,
    title: 'Open participation',
    description:
      'Built on open standards, SecureX is accessible to institutions of every size, across every industry.',
  },
];

const FEATURES = [
  'Tamper-evident credentials anchored on a distributed ledger',
  'Instant verification without contacting the issuer',
  'Advanced fraud detection scoring every verification',
  'Self-sovereign storage that gives holders control',
];

export default function AboutPage() {
  return (
    <div className="overflow-hidden bg-white">
      {/* Hero */}
      <section className="relative bg-neutral-950">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-securex-600/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-trust-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 backdrop-blur">
              <Compass className="h-4 w-4 text-trust-400" />
              About SecureX
              <span className="h-1 w-1 rounded-full bg-trust-400" />
              Digital Trust Network
            </div>

            <h1 className="mt-7 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-7xl">
              Making every credential
              <span className="block bg-gradient-to-r from-securex-400 via-trust-400 to-cyan-400 bg-clip-text text-transparent">
                trustworthy.
              </span>
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-neutral-300 sm:text-xl">
              SecureX exists to eliminate credential fraud and restore trust in
              academic and professional qualifications.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200">
                <LockKeyhole className="h-4 w-4 text-trust-400" />
                Cryptographically secured
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200">
                <ShieldCheck className="h-4 w-4 text-securex-400" />
                Fraud resistant
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="bg-white py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-securex-600">
                What we do
              </span>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
                A new standard for
                <span className="block text-securex-600">
                  credential verification.
                </span>
              </h2>

              <p className="mt-5 text-lg leading-8 text-neutral-600">
                SecureX is a digital credential trust network. Institutions
                issue cryptographically signed credentials, holders store them
                in a portable digital wallet, and employers verify them
                instantly through a decentralized, fraud-resistant ledger.
              </p>

              <div className="mt-8 space-y-4">
                {FEATURES.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 transition-all hover:-translate-y-0.5 hover:border-securex-200 hover:shadow-md"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-securex-600" />
                    <span className="text-sm font-medium leading-relaxed text-neutral-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="group rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-securex-200 hover:shadow-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-securex-50 text-securex-600">
                  <Award className="h-7 w-7" />
                </div>

                <h3 className="mt-6 text-lg font-bold text-neutral-900">
                  Degrees & certificates
                </h3>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  Universities and certification bodies issue verifiable
                  academic credentials.
                </p>

                <ArrowRight className="mt-6 h-5 w-5 text-securex-500 transition-transform group-hover:translate-x-1" />
              </div>

              <div className="group rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-trust-200 hover:shadow-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-trust-50 text-trust-600">
                  <Workflow className="h-7 w-7" />
                </div>

                <h3 className="mt-6 text-lg font-bold text-neutral-900">
                  Professional verification
                </h3>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  Employers confirm qualifications in seconds with full audit
                  trails.
                </p>

                <ArrowRight className="mt-6 h-5 w-5 text-trust-500 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative bg-neutral-50 py-24 lg:py-28">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-securex-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-securex-600">
              Our principles
            </span>

            <h2 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
              What we stand for
            </h2>

            <p className="mt-4 text-lg text-neutral-600">
              The principles behind every decision we make and every feature we
              ship.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="group rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-securex-200 hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-securex-50 to-trust-50 text-securex-600 transition-transform duration-300 group-hover:scale-110">
                  <value.icon className="h-7 w-7" />
                </div>

                <h3 className="mt-6 text-lg font-bold text-neutral-900">
                  {value.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-neutral-950 py-24">
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-securex-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <ShieldCheck className="h-8 w-8 text-trust-400" />
          </div>

          <h2 className="mt-7 text-3xl font-black text-white sm:text-5xl">
            Build trust with SecureX
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-300">
            Join the network making credential verification instant, secure,
            and fraud-resistant for everyone.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/auth/register" size="lg">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button
              href="/how-it-works"
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              See how it works
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}