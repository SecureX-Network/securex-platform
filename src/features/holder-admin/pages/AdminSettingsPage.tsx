import { useState } from 'react';
import {
  Activity,
  Bell,
  KeyRound,
  Save,
  Settings2,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  Input,
  ModeIndicator,
  Select,
} from '@/components/ui';

interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
}

const MOCK_API_KEYS: ApiKey[] = [
  {
    id: 'key-1',
    label: 'Production verification',
    prefix: 'sx_live_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022a3f9',
    createdAt: 'Jan 12, 2026',
    lastUsed: '2 hours ago',
  },
  {
    id: 'key-2',
    label: 'Sandbox integration',
    prefix: 'sx_test_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u20227c21',
    createdAt: 'Mar 03, 2026',
    lastUsed: '3 days ago',
  },
];

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [auditDigest, setAuditDigest] = useState(true);
  const [blockchainName, setBlockchainName] = useState('SecureX Ledger');
  const [blockInterval, setBlockInterval] = useState('6');
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Platform Settings</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Configure network parameters, access policies, and integration
              endpoints.
            </p>
          </div>
          <ModeIndicator />
        </div>
      </section>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            System Settings
          </h2>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Network name"
              value={blockchainName}
              onChange={(e) => setBlockchainName(e.target.value)}
            />
            <Select
              label="Block production interval (seconds)"
              value={blockInterval}
              onChange={(e) => setBlockInterval(e.target.value)}
              options={[
                { label: '3 seconds', value: '3' },
                { label: '6 seconds', value: '6' },
                { label: '12 seconds', value: '12' },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Validator threshold"
              defaultValue="4 / 7 nodes"
              helperText="Minimum signature threshold for block finality."
            />
            <Input
              label="Verification rate limit"
              defaultValue="100 req/min"
              helperText="Per IP address for public verification endpoints."
            />
          </div>
          <Button leftIcon={<Save className="h-4 w-4" />}>Save changes</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Maintenance
          </h2>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-800">
              Maintenance mode
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              When enabled, public verification and holder actions are paused.
              Admin access remains available.
            </p>
          </div>
          <div className="relative shrink-0">
            <input
              id="maintenance-toggle"
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="peer sr-only"
            />
            <label
              htmlFor="maintenance-toggle"
              className="relative block h-6 w-11 cursor-pointer rounded-full bg-neutral-300 transition-colors peer-checked:bg-securex-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
            />
          </div>
        </div>
        {maintenanceMode && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
            <Activity className="h-4 w-4 shrink-0" />
            Maintenance mode is currently ON. Users will see a maintenance
            notice.
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            API Keys
          </h2>
        </div>
        <p className="mb-4 text-sm text-neutral-500">
          Keys are shown in full only when created. Treat them like secrets.
        </p>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-100 text-left">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Label
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Key
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Created
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Last used
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {MOCK_API_KEYS.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-800">
                    {key.label}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {key.prefix}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {key.createdAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {key.lastUsed}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-600"
                      onClick={() => setRevokeKey(key)}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button variant="outline" leftIcon={<KeyRound className="h-4 w-4" />}>
            Generate new key
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Notification Settings
          </h2>
        </div>
        <div className="space-y-3">
          <Checkbox
            label="Email me for critical security alerts"
            description="Immediate notifications for CRITICAL and HIGH severity events."
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
          />
          <Checkbox
            label="Weekly audit digest"
            description="A summary of audit events and platform activity every Monday."
            checked={auditDigest}
            onChange={(e) => setAuditDigest(e.target.checked)}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-trust-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Access Control
          </h2>
        </div>
        <p className="mb-3 text-sm text-neutral-500">
          Role-based access controls are enforced for institutions, issuers,
          employers, and security staff. Session tokens expire after 24 hours.
          MFA is required for all administrative roles.
        </p>
        <div className="rounded-lg bg-neutral-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Roles enforced
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR', 'INSTITUTION', 'ISSUER', 'EMPLOYER', 'HOLDER'].map((role) => (
              <span
                key={role}
                className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200"
              >
                {role.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Dialog
        open={revokeKey !== null}
        title="Revoke API key?"
        message={
          <>
            This will permanently revoke the <strong>{revokeKey?.label}</strong>{' '}
            key. Any integrations using it will immediately stop working.
          </>
        }
        variant="danger"
        confirmLabel="Revoke Key"
        onConfirm={() => setRevokeKey(null)}
        onCancel={() => setRevokeKey(null)}
      />
    </div>
  );
}
