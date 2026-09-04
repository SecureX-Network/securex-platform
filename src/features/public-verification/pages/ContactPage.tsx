import { useState, type FormEvent } from 'react';

import {
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';

import { Alert, Button, Card, Input } from '@/components/ui';

const FAQS = [
  {
    question: 'How much does SecureX cost for employers?',
    answer:
      'Credential verification is free for employers and public users. Enterprise integrations and high-volume API access are available through a subscription.',
  },
  {
    question: 'Can my institution issue credentials on SecureX?',
    answer:
      'Absolutely. Register your institution, complete the verification process, and you can start issuing cryptographically signed credentials within minutes.',
  },
  {
    question: 'How is each credential secured?',
    answer:
      'Every credential is signed by the issuing institution and hashed onto a distributed ledger, making it tamper-evident and independently verifiable.',
  },
  {
    question: 'How can I verify a credential?',
    answer:
      'Enter the credential ID on the Verify page, scan its QR code, or follow a secure verification link. Results are returned instantly.',
  },
];

const CONTACT_METHODS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@securex.io',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+1 (555) 010-8493',
  },
  {
    icon: MapPin,
    label: 'Address',
    value: '100 Market Street, Suite 400, San Francisco, CA 94103',
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Please enter your name.';
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.subject.trim()) {
      nextErrors.subject = 'Please enter a subject.';
    }

    if (form.message.trim().length < 10) {
      nextErrors.message = 'Please enter at least 10 characters.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  }

  function handleChange(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field] && value.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-neutral-950">
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-trust-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -right-40 -top-20 h-[28rem] w-[28rem] rounded-full bg-securex-500/10 blur-3xl" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.16),transparent_55%)]" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(80,70,229,0.12),transparent_55%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-neutral-300 shadow-lg backdrop-blur-md">
              <MessageSquare className="h-4 w-4 text-trust-400" />
              Contact Us
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Talk to the{' '}
              <span className="bg-gradient-to-r from-trust-400 to-securex-400 bg-clip-text text-transparent">
                SecureX team
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
              Questions about issuing, verifying, or integrating with
              SecureX? We would love to hear from you.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-neutral-300 backdrop-blur-md">
                🔐 Secure communication
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-neutral-300 backdrop-blur-md">
                ⚡ Fast response
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="relative overflow-hidden bg-neutral-50 py-20 lg:py-24">
        <div className="pointer-events-none absolute left-0 top-20 h-72 w-72 rounded-full bg-trust-500/5 blur-3xl" />

        <div className="pointer-events-none absolute bottom-10 right-0 h-80 w-80 rounded-full bg-securex-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">

            {/* Form */}
            <Card
              padding="lg"
              className="border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-shadow duration-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
            >
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-trust-100 bg-trust-50 px-3 py-1.5 text-xs font-semibold text-trust-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Get in touch
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
                  Send us a message
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                  Fill out the form and our team will respond within one
                  business day.
                </p>
              </div>

              {submitted ? (
                <Alert variant="success" className="mt-6">
                  Thanks for reaching out! Your message has been recorded and
                  someone from the SecureX team will get back to you shortly.
                </Alert>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  noValidate
                >
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="Name"
                      placeholder="Jane Doe"
                      autoComplete="name"
                      value={form.name}
                      error={errors.name}
                      onChange={(e) =>
                        handleChange('name', e.target.value)
                      }
                    />

                    <Input
                      label="Email"
                      type="email"
                      placeholder="jane@example.com"
                      autoComplete="email"
                      value={form.email}
                      error={errors.email}
                      onChange={(e) =>
                        handleChange('email', e.target.value)
                      }
                    />
                  </div>

                  <Input
                    label="Subject"
                    placeholder="How can we help?"
                    value={form.subject}
                    error={errors.subject}
                    onChange={(e) =>
                      handleChange('subject', e.target.value)
                    }
                  />

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="mb-1.5 block text-sm font-medium text-neutral-700"
                    >
                      Message
                    </label>

                    <textarea
                      id="contact-message"
                      rows={5}
                      placeholder="Tell us a little about your organization and how we can help."
                      value={form.message}
                      onChange={(e) =>
                        handleChange('message', e.target.value)
                      }
                      aria-invalid={
                        errors.message ? true : undefined
                      }
                      className={
                        errors.message
                          ? 'w-full rounded-xl border border-danger-300 bg-white p-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-danger-500 focus:outline-none focus:ring-2 focus:ring-danger-100'
                          : 'w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all hover:border-neutral-300 focus:border-securex-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-securex-100'
                      }
                    />

                    {errors.message && (
                      <p className="mt-1.5 text-xs text-danger-600">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    isLoading={submitting}
                    rightIcon={<Send className="h-4 w-4" />}
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card
                padding="lg"
                className="border border-neutral-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-trust-50 to-securex-50 text-securex-600">
                    <Mail className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      Contact information
                    </h2>

                    <p className="text-xs text-neutral-500">
                      We are here to help.
                    </p>
                  </div>
                </div>

                <ul className="mt-7 space-y-3">
                  {CONTACT_METHODS.map((method) => (
                    <li
                      key={method.label}
                      className="group flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-securex-100 hover:bg-white hover:shadow-md"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-securex-50 text-securex-600 transition-colors group-hover:bg-securex-100">
                        <method.icon className="h-5 w-5" />
                      </span>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          {method.label}
                        </div>

                        <div className="mt-1 break-words text-sm font-medium text-neutral-800">
                          {method.value}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Enterprise Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-securex-100 bg-gradient-to-br from-securex-50 via-white to-trust-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-securex-500/10 blur-2xl transition-all group-hover:bg-securex-500/20" />

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                      <ShieldCheck className="h-5 w-5 text-securex-600" />
                    </div>

                    <h3 className="text-base font-bold text-neutral-900">
                      Businesses & institutions
                    </h3>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-neutral-600">
                    For enterprise deployments and institutional
                    partnerships, tell us your use case and one of our
                    specialists will reach out.
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-securex-700 shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Enterprise ready
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-securex-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-securex-100 bg-securex-50 px-3 py-1.5 text-xs font-semibold text-securex-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Frequently Asked Questions
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Everything you need to know
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-500 sm:text-base">
              Quick answers to common questions about SecureX,
              verification, and institutional credentials.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {FAQS.map((faq) => (
              <Card
                key={faq.question}
                padding="lg"
                className="group border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-securex-100 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-securex-50 to-trust-50 text-securex-600 transition-transform duration-300 group-hover:scale-110">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold leading-6 text-neutral-900">
                      {faq.question}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-neutral-500">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-neutral-950 py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-trust-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-lg">
            <ShieldCheck className="h-7 w-7 text-trust-400" />
          </div>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Build trust with SecureX
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
            Secure, verifiable credentials make it easier for institutions,
            employers, and individuals to trust digital achievements.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-neutral-300">
              🔐 Tamper-evident
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-neutral-300">
              ⚡ Instant verification
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-neutral-300">
              🌐 Globally accessible
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}