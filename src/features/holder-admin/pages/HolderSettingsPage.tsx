import { useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Button, Card, Checkbox, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function HolderSettingsPage() {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [notifyVerified, setNotifyVerified] = useState(true);
  const [notifyShare, setNotifyShare] = useState(true);
  const [notifySecurity, setNotifySecurity] = useState(true);
  const [shareProfilePublic, setShareProfilePublic] = useState(false);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Manage your profile, security, and privacy preferences.
        </p>
      </section>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Profile
          </h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Full name"
            defaultValue={user?.name ?? ''}
            leftIcon={<UserIcon className="h-4 w-4" />}
          />
          <Input
            label="Email address"
            type="email"
            defaultValue={user?.email ?? ''}
            leftIcon={<Mail className="h-4 w-4" />}
          />
          <Button>Save profile</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Security
          </h2>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Current password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter current password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="flex items-center text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
            />
            <Input
              label="Confirm new password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
            />
            <Button leftIcon={<KeyRound className="h-4 w-4" />}>
              Change password
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-securex-50 text-securex-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-800">
                  Two-factor authentication
                </p>
                <p className="text-xs text-neutral-500">
                  Add an extra layer of security to your account sign-in.
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                id="mfa-toggle"
                type="checkbox"
                checked={mfaEnabled}
                onChange={(e) => setMfaEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="mfa-toggle"
                className="relative h-6 w-11 cursor-pointer rounded-full bg-neutral-300 transition-colors peer-checked:bg-securex-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Notification preferences
          </h2>
        </div>
        <div className="space-y-3">
          <Checkbox
            label="Credential verified"
            description="Notify me when a verifier confirms one of my credentials."
            checked={notifyVerified}
            onChange={(e) => setNotifyVerified(e.target.checked)}
          />
          <Checkbox
            label="Share requests"
            description="Notify me when an employer requests access to a credential."
            checked={notifyShare}
            onChange={(e) => setNotifyShare(e.target.checked)}
          />
          <Checkbox
            label="Security alerts"
            description="Notify me about sign-ins and security-related updates."
            checked={notifySecurity}
            onChange={(e) => setNotifySecurity(e.target.checked)}
          />
          <Button variant="outline">Save preferences</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Privacy
          </h2>
        </div>
        <div className="space-y-3">
          <Checkbox
            label="Public credential profile"
            description="Allow employers to discover a minimal public profile with your verified credentials."
            checked={shareProfilePublic}
            onChange={(e) => setShareProfilePublic(e.target.checked)}
          />
          <p className="text-xs text-neutral-500">
            Your personal data is only shared with verifiers you approve. Review
            how SecureX uses your data in the privacy policy.
          </p>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-danger-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Account
          </h2>
        </div>
        <p className="mb-3 text-sm text-neutral-500">
          Permanently deletes your account and all associated credentials. This
          action cannot be undone.
        </p>
        <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
          Delete account
        </Button>
      </Card>
    </div>
  );
}