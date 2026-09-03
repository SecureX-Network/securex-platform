import { useMemo, useState } from 'react';
import {
  Eye,
  FileText,
  LayoutTemplate,
  Plus,
  Search,
  Type,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
} from '@/components/ui';
import { MOCK_TEMPLATES } from '@/services/mock';
import { formatDate } from '@/utils/format';
import type { Template } from '@/types';

export default function InstitutionTemplatesPage() {
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_TEMPLATES;
    const q = search.toLowerCase();
    return MOCK_TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Credential Templates
          </h1>
          <p className="text-sm text-neutral-500">
            Standardized templates for your credential issuance workflows.
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreate(true)}
        >
          Create Template
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search templates..."
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="sm"
          aria-label="Search templates"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              compact
              icon={<LayoutTemplate className="h-6 w-6" />}
              title="No templates found"
              description="Try adjusting your search term."
            />
          </div>
        ) : (
          <>
            {filtered.map((template) => (
              <Card
                key={template.id}
                padding="md"
                className="flex flex-col transition-all hover:shadow-securex-md"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-securex-50 text-securex-600">
                    <LayoutTemplate className="h-5 w-5" />
                  </span>
                  <Badge variant="default" size="sm">
                    {template.fields.length} fields
                  </Badge>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                  {template.name}
                </h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-neutral-500">
                  {template.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                  <span className="text-xs text-neutral-500">
                    Used{' '}
                    <span className="font-semibold text-neutral-800">
                      {template.usageCount}
                    </span>{' '}
                    times
                  </span>
                  <span className="text-xs text-neutral-400">
                    {formatDate(template.createdAt)}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => setPreviewing(template)}
                  >
                    Preview
                  </Button>
                  <Button variant="ghost" size="sm" disabled title="Editing coming soon">
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </>
        )}
        {!search.trim() && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 text-neutral-400 transition-colors hover:border-securex-300 hover:bg-securex-50/30 hover:text-securex-600"
            aria-label="Create new template"
          >
            <Plus className="h-8 w-8" />
            <span className="mt-2 text-sm font-medium">New Template</span>
          </button>
        )}
      </div>

      <Modal
        open={previewing !== null}
        onClose={() => setPreviewing(null)}
        title={previewing ? `Preview: ${previewing.name}` : 'Template Preview'}
        size="lg"
      >
        {previewing && (
          <div className="space-y-5">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-securex-600 text-white">
                  <FileText className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {previewing.name}
                  </h3>
                  <p className="text-sm text-neutral-500">
                    {previewing.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-neutral-200 pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Template Fields
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {previewing.fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5"
                    >
                      <Type className="mt-0.5 h-4 w-4 shrink-0 text-securex-500" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
                          {field.label}
                          {field.required && (
                            <span className="text-danger-500">*</span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {field.type}
                          {field.options ? ` · ${field.options.join(', ')}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Template"
        description="Design a new credential template."
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              disabled
              title="Full template editor coming soon"
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-5 text-center">
          <LayoutTemplate className="mx-auto h-8 w-8 text-neutral-400" />
          <p className="mt-3 text-sm font-medium text-neutral-700">
            Template editor coming soon
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            You&apos;ll be able to define custom fields, validation rules,
            and credential metadata. This feature is under development.
          </p>
        </div>
      </Modal>
    </div>
  );
}
