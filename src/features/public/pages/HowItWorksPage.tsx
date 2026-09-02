import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileSignature,
  IdCard,
  Lock,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui';

const AUDIENCES = [
  {
    icon: Building2,
    eyebrow: 'For Institutions',
    title: 'Issue credentials in minutes, not weeks',
    intro:
      'Digitize your credentialing process and put verifiable records on the ledger.',
    steps: [
      {
        icon: FileSignature,
        title: 'Register your institution',
        description:
          'Create your institution account and complete verification to establish trust on the network.',
      },
      {
        icon: IdCard,
        title: 'Set up templates & issuers',
        description:
          'Define credential templates and authorize issuer accounts under your institution.',
      },
      {
        icon: BadgeCheck,
        title: 'Issue verified credentials',
        description:
          'Select a recipient, fill in the details, and issue a cryptographically signed credential.',
      },
      {
        icon: Lock,
        title: 'Anchored to the ledger',
        description:
          'Each credential is hashed and written to the distributed ledger, making it tamper-evident.',
      },
    ],
  },
  {
    icon: Wallet,
    eyebrow: 'For Holders',
    title: 'Own and share your credentials',
    intro:
      'Keep your records in one secure wallet and share them on your terms.',
    steps: [
      {
        icon: BadgeCheck,
        title: 'Receive your credential',
        description:
          'Credentials issued to you appear in your digital wallet automatically.',
      },
      {
        icon: Wallet,
        title: 'Store securely',
        description:
          'Your credentials live in an encrypted wallet that only you can access.',
      },
      {
        icon: Share2,
        title: 'Share in one tap',
        description:
          'Share via QR code or secure link without ever giving away your private key.',
      },
      {
        icon: QrCode,
        title: 'Let others verify',
        description:
          'Any employer or institution can instantly confirm authenticity.',
      },
    ],
  },
  {
    icon: Search,
    eyebrow: 'For Employers',
    title: 'Verify in seconds with confidence',
    intro:
      'Eliminate background-check delays and qualification fraud.',
    steps: [
      {
        icon: Search,
        title: 'Scan or search',
        description:
          'Scan the credential QR code or type in the credential ID.',
      },
      {
        icon: ShieldCheck,
        title: 'Get an instant result',
        description:
          'SecureX checks the ledger proof, digital signature, and issuer status.',
      },
      {
        icon: BadgeCheck,
        title: 'Review fraud assessment',
        description:
          'See the risk score and any flags raised by the fraud detection engine.',
      },
      {
        icon: Lock,
        title: 'Keep a verifiable record',
        description:
          'Every verification is time-stamped and stored for your audit trail.',
      },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              <ShieldCheck className="h-3.5 w-3.5 text-trust-400" />
              How It Works
            </span>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              One network. Three simple roles.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral-300">
              SecureX connects institutions that issue credentials, holders who
              own them, and employers who verify them.
            </p>
          </div>
        </div>
      </section>

      {/* Audience sections */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl space-y-24 px-4 sm:px-6 lg:px-8">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.eyebrow}
              className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-start"
            >
              <div className="lg:sticky lg:top-10">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-securex-600 text-white">
                  <audience.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-2xl font-bold text-neutral-900 sm:text-3xl">
                  {audience.title}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-neutral-600">
                  {audience.intro}
                </p>
                <div className="mt-6">
                  <Button href="/auth/register" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Get started
                  </Button>
                </div>
              </div>
              <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {audience.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-securex-600">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
                        <step.icon className="h-4.5 w-4.5" />
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-neutral-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-950 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to verify in seconds?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-300">
            Create an account and join a network where trust is built on
            cryptography, not assumptions.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/verify" size="lg">
              Verify a Credential
            </Button>
            <Button
              href="/auth/register"
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Create an Account
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}