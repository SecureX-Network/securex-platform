import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Mail,
  Send,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { issueCredential } from '@/services/api/credentialService';
import { MOCK_TEMPLATES } from '@/services/mock';
import { formatDate } from '@/utils/format';

const CREDENTIAL_TYPES = [
  'Degree',
  'Certificate',
  'Diploma',
  'Transcript',
  'License',
  'Award',
];

export default function InstitutionIssuePage() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    type: '',
    title: '',
    description: '',
    holderName: '',
    holderEmail: '',
    templateId: '',
    expiresAt: '',
  });
  const [formErrors, setFormErrors] = useState({
    type: '',
    title: '',
    holderName: '',
    holderEmail: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [issuedId, setIssuedId] = useState('');

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const selectedTemplate = MOCK_TEMPLATES.find((t) => t.id === form.templateId);

  const isValid =
    Boolean(form.type) &&
    Boolean(form.title) &&
    Boolean(form.holderName) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.holderEmail);

  const validateAndSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errors = { type: '', title: '', holderName: '', holderEmail: '' };
      if (!form.type) errors.type = 'Please select a credential type.';
      if (!form.title.trim()) errors.title = 'Title is required.';
      if (!form.holderName.trim()) errors.holderName = 'Holder name is required.';
      if (!form.holderEmail.trim()) {
        errors.holderEmail = 'Holder email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.holderEmail)) {
        errors.holderEmail = 'Please enter a valid email address.';
      }

      const hasErrors = Object.values(errors).some(Boolean);
      setFormErrors(errors);
      setTouched({ type: true, title: true, holderName: true, holderEmail: true });

      if (hasErrors) return;

      setSubmitting(true);
      try {
      const result = await issueCredential({
        type: form.type,
        title: form.title,
        description: form.description,
        holderName: form.holderName,
        holderId: `holder-${Date.now()}`,
        issuerId: 'iss-stanford-registrar',
        issuerName: 'Stanford Office of the Registrar',
        institutionId: user?.institutionId ?? 'inst-stanford',
        institutionName: 'Stanford University',
        templateId: form.templateId || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setIssuedId(result.credentialId);
      setShowSuccess(true);
      setSubmitError(null);
      setForm({
        type: '',
        title: '',
        description: '',
        holderName: '',
        holderEmail: '',
        templateId: '',
        expiresAt: '',
      });
      setTouched({});
      setFormErrors({ type: '', title: '', holderName: '', holderEmail: '' });
    } catch {
      setSubmitError(
        'Unable to issue the credential at this time. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
    },
    [form, user],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/institution/dashboard"
          aria-label="Back to dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Issue New Credential
          </h1>
          <p className="text-sm text-neutral-500">
            Create a cryptographically signed credential and anchor it to the
            SecureX ledger.
          </p>
        </div>
      </div>

      {submitError && (
        <Alert variant="error" title="Unable to issue credential">
          {submitError}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <form onSubmit={validateAndSubmit} className="space-y-5 lg:col-span-3" noValidate>
          <Card title="Credential Details" padding="lg">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Credential Type"
                  options={CREDENTIAL_TYPES.map((t) => ({
                    label: t,
                    value: t,
                  }))}
                  placeholder="Select type"
                  value={form.type}
                  onChange={(e) => update('type', e.target.value)}
                  error={touched.type ? formErrors.type || undefined : undefined}
                />
                <Select
                  label="Template (optional)"
                  options={MOCK_TEMPLATES.map((t) => ({
                    label: t.name,
                    value: t.id,
                  }))}
                  placeholder="Select template"
                  value={form.templateId}
                  onChange={(e) => update('templateId', e.target.value)}
                />
              </div>
              <Input
                label="Title"
                placeholder="e.g. Bachelor of Science in Computer Science"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                onBlur={() => markTouched('title')}
                error={touched.title ? formErrors.title || undefined : undefined}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Credential description..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors hover:border-neutral-400 focus:border-securex-500 focus:outline-none focus:ring-2 focus:ring-securex-100"
                />
              </div>
            </div>
          </Card>

          <Card title="Holder Information" padding="lg">
            <div className="space-y-4">
              <Input
                label="Holder Name"
                placeholder="Full name"
                leftIcon={<User className="h-4 w-4" />}
                value={form.holderName}
                onChange={(e) => update('holderName', e.target.value)}
                onBlur={() => markTouched('holderName')}
                error={touched.holderName ? formErrors.holderName || undefined : undefined}
              />
              <Input
                label="Holder Email"
                type="email"
                placeholder="holder@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                value={form.holderEmail}
                onChange={(e) => update('holderEmail', e.target.value)}
                onBlur={() => markTouched('holderEmail')}
                error={touched.holderEmail ? formErrors.holderEmail || undefined : undefined}
              />
              <Input
                label="Expiry Date (optional)"
                type="date"
                leftIcon={<Calendar className="h-4 w-4" />}
                value={form.expiresAt}
                onChange={(e) => update('expiresAt', e.target.value)}
              />
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              isLoading={submitting}
              disabled={!isValid}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Issue Credential
            </Button>
            <Link to="/institution/dashboard">
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
          </div>
        </form>

        <div className="lg:col-span-2">
          <Card title="Preview" padding="lg" className="lg:sticky lg:top-20">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-securex-600 text-white">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-neutral-900">
                    {form.title || 'Credential Title'}
                  </h4>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {form.type || 'Type'} {form.templateId && `· ${selectedTemplate?.name ?? ''}`}
                  </p>
                </div>
              </div>

              {form.description && (
                <p className="mt-3 text-xs leading-relaxed text-neutral-600">
                  {form.description}
                </p>
              )}

              <div className="mt-4 space-y-2 border-t border-neutral-200 pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Holder</span>
                  <span className="font-medium text-neutral-800">
                    {form.holderName || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Email</span>
                  <span className="font-medium text-neutral-800">
                    {form.holderEmail || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Issuer</span>
                  <span className="font-medium text-neutral-800">
                    Stanford Office of the Registrar
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Issued</span>
                  <span className="font-medium text-neutral-800">—</span>
                </div>
                {form.expiresAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Expires</span>
                    <span className="font-medium text-neutral-800">
                      {formatDate(form.expiresAt)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <Badge variant="success" size="sm" dot>
                  Draft
                </Badge>
              </div>
            </div>

            {selectedTemplate && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-neutral-500">
                  Template Fields
                </p>
                <div className="space-y-1.5">
                  {selectedTemplate.fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-neutral-600">{field.label}</span>
                      <span className="text-neutral-400">
                        {field.type}
                        {field.required && (
                          <span className="ml-1 text-danger-500">*</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Credential Issued"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setShowSuccess(false)}>Done</Button>
            <Link to="/institution/credentials">
              <Button variant="outline">View All Credentials</Button>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-trust-50">
            <CheckCircle2 className="h-8 w-8 text-trust-600" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-neutral-900">
            Successfully Issued
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            The credential has been cryptographically signed and anchored to the
            blockchain.
          </p>
          <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-2.5">
            <p className="text-xs text-neutral-500">Credential ID</p>
            <p className="font-mono text-sm font-semibold text-neutral-900">
              {issuedId}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
