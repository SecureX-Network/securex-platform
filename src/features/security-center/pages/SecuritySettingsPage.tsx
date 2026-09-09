import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Monitor,
  Server,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Card, Badge, Skeleton } from '@/components/ui';
import { formatDate } from '@/utils';
import {
  getServiceHealth,
  getActiveSessions,
} from '../services/securityCenterService';
import type { SecurityServiceHealth, SecuritySession } from '../types/security';

const statusColor: Record<string, string> = {
  OPERATIONAL: 'bg-trust-500',
  DEGRADED: 'bg-warning-500',
  OUTAGE: 'bg-danger-500',
  UNKNOWN: 'bg-neutral-400',
};

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  OPERATIONAL: 'success',
  DEGRADED: 'warning',
  OUTAGE: 'danger',
  UNKNOWN: 'default',
};

export default function SecuritySettingsPage() {
  const [services, setServices] = useState<SecurityServiceHealth[]>([]);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [sv, se] = await Promise.all([
        getServiceHealth(),
        getActiveSessions(),
      ]);
      setServices(sv);
      setSessions(se);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-danger-600" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-danger-900">Unable to load status</h1>
            <p className="mt-2 text-sm text-danger-800">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const operationalCount = services.filter((s) => s.status === 'OPERATIONAL').length;
  const totalCount = services.length;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-neutral-900">System Status</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Service health, active sessions, and security configuration.
        </p>
      </section>

      <Card>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Service Health Overview
          </h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {operationalCount} of {totalCount} services operational.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-trust-500 transition-all"
              style={{ width: `${(operationalCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-neutral-700">
            {Math.round((operationalCount / totalCount) * 100)}%
          </span>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.name}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-neutral-400" />
                <h3 className="text-sm font-semibold text-neutral-900">
                  {service.name}
                </h3>
              </div>
              <span
                className={`h-3 w-3 rounded-full ${statusColor[service.status]}`}
                aria-label={`Status: ${service.status}`}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={statusBadge[service.status]} size="sm">
                {service.status}
              </Badge>
              {service.responseTimeMs != null && (
                <span className="text-xs text-neutral-500">
                  {service.responseTimeMs}ms
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-neutral-500">{service.description}</p>
            <p className="mt-2 text-[11px] text-neutral-400">
              Last checked: {formatDate(service.lastChecked, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Active Sessions
          </h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Currently active and recent user sessions across the platform.
        </p>
        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            No active sessions.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-neutral-100">
            {sessions.map((session) => (
              <div key={session.sessionId} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                  <User className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-800">
                      {session.user}
                    </p>
                    <Badge variant="info" size="sm">
                      {session.role.replace(/_/g, ' ')}
                    </Badge>
                    {session.isActive && (
                      <span className="flex items-center gap-1 text-xs text-trust-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-trust-500" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {session.ipAddress}
                    </span>
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {session.device}
                    </span>
                    <span>{session.location}</span>
                  </div>
                  <div className="mt-1 flex gap-x-4 text-[11px] text-neutral-400">
                    <span>Started: {formatDate(session.startedAt, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                    <span>Last active: {formatDate(session.lastActivityAt, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-securex-600" />
          <h2 className="text-base font-semibold text-neutral-900">
            Security Configuration
          </h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Current security settings and policies.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-trust-600" />
              <p className="text-sm font-medium text-neutral-800">Multi-Factor Authentication</p>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Required for all admin and security roles.
            </p>
            <Badge variant="success" size="sm" className="mt-2">
              Enabled
            </Badge>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-trust-600" />
              <p className="text-sm font-medium text-neutral-800">Session Timeout</p>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Active sessions expire after 30 minutes of inactivity.
            </p>
            <Badge variant="success" size="sm" className="mt-2">
              30 minutes
            </Badge>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-trust-600" />
              <p className="text-sm font-medium text-neutral-800">Rate Limiting</p>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              API endpoints protected with per-IP rate limiting.
            </p>
            <Badge variant="success" size="sm" className="mt-2">
              Active
            </Badge>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-trust-600" />
              <p className="text-sm font-medium text-neutral-800">Brute Force Protection</p>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Accounts locked after 5 failed attempts within 10 minutes.
            </p>
            <Badge variant="success" size="sm" className="mt-2">
              Active
            </Badge>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-trust-600" />
              <p className="text-sm font-medium text-neutral-800">Audit Logging</p>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              All security-relevant actions are logged immutably.
            </p>
            <Badge variant="success" size="sm" className="mt-2">
              Enabled
            </Badge>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-trust-600" />
              <p className="text-sm font-medium text-neutral-800">Blockchain Verification</p>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              All credentials verified against the distributed ledger.
            </p>
            <Badge variant="success" size="sm" className="mt-2">
              Active
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
