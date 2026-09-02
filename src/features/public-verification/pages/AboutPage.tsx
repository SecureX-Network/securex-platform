import {
  Award,
  Compass,
  Eye,
  Globe,
  HeartHandshake,
  ShieldCheck,
  Workflow,
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

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              <Compass className="h-3.5 w-3.5 text-trust-400" />
              About SecureX
            </span>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Our mission: make every credential trustworthy
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral-300">
              SecureX exists to eliminate credential fraud and restore trust in
              academic and professional qualifications. We bring institutions,
              holders, and employers onto a single, tamper-proof network where
              authenticity is verified in seconds — not weeks.
            </p>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">
                What SecureX does
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-neutral-600">
                SecureX is a digital credential trust network. Institutions
                issue cryptographically signed credentials; holders store them
                in a portable digital wallet; and employers verify them
                instantly through a decentralized, fraud-resistant ledger.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Tamper-evident credentials anchored on a distributed ledger',
                  'Instant verification without contacting the issuer',
                  'Advanced fraud detection scoring every verification',
                  'Self-sovereign storage that gives holders control',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-neutral-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-trust-50 text-trust-600">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-relaxed sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                <Award className="h-8 w-8 text-securex-600" />
                <h3 className="mt-4 text-base font-semibold text-neutral-900">
                  Degrees & certificates
                </h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Universities and certification bodies issue verifiable academic credentials.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                <Workflow className="h-8 w-8 text-securex-600" />
                <h3 className="mt-4 text-base font-semibold text-neutral-900">
                  Professional verification
                </h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Employers confirm qualifications in seconds with full audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
              What we stand for
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              The principles behind every decision we make and every feature we ship.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-securex-50 text-securex-600">
                  <value.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-950 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Build trust with SecureX
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-300">
            Join the network that is making credential verification instant,
            secure, and fraud-free for everyone.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/auth/register" size="lg">
              Get Started
            </Button>
            <Button
              href="/how-it-works"
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              See how it works
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}