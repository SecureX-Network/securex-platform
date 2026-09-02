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
    if (!form.name.trim()) nextErrors.name = 'Please enter your name.';
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

    if (Object.keys(nextErrors).length > 0) return;

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
    setForm((prev) => ({ ...prev, [field]: value }));
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
      <section className="bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
              <MessageSquare className="h-3.5 w-3.5 text-trust-400" />
              Contact Us
            </span>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Talk to the SecureX team
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral-300">
              Questions about issuing, verifying, or integrating with SecureX?
              We would love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-neutral-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Form */}
            <Card padding="lg" className="shadow-securex">
              <h2 className="text-xl font-bold text-neutral-900">
                Send us a message
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Fill out the form and our team will respond within one business day.
              </p>

              {submitted ? (
                <Alert variant="success" className="mt-6">
                  Thanks for reaching out! Your message has been recorded and
                  someone from the SecureX team will get back to you shortly.
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="Name"
                      placeholder="Jane Doe"
                      autoComplete="name"
                      value={form.name}
                      error={errors.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="jane@example.com"
                      autoComplete="email"
                      value={form.email}
                      error={errors.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                  <Input
                    label="Subject"
                    placeholder="How can we help?"
                    value={form.subject}
                    error={errors.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
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
                      onChange={(e) => handleChange('message', e.target.value)}
                      aria-invalid={errors.message ? true : undefined}
                      className={
                        errors.message
                          ? 'w-full rounded-lg border border-danger-300 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-danger-500 focus:ring-danger-100'
                          : 'w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-400 focus:border-securex-500 focus:outline-none focus:ring-2 focus:ring-securex-100'
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

            {/* Contact info */}
            <div className="space-y-6">
              <Card padding="lg">
                <h2 className="text-base font-semibold text-neutral-900">
                  Contact information
                </h2>
                <ul className="mt-4 space-y-4">
                  {CONTACT_METHODS.map((method) => (
                    <li key={method.label} className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-securex-50 text-securex-600">
                        <method.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          {method.label}
                        </div>
                        <div className="mt-0.5 break-words text-sm text-neutral-800">
                          {method.value}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
              <div className="rounded-2xl border border-securex-100 bg-securex-50 p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-securex-600" />
                  <h3 className="text-base font-semibold text-neutral-900">
                    Businesses & institutions
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  For enterprise deployments and institutional partnerships,
                  tell us your use case and one of our specialists will reach out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6"
              >
                <h3 className="text-base font-semibold text-neutral-900">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}