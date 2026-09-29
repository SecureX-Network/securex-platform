import { Activity, AlertTriangle, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
import { Card, EmptyState, Skeleton } from '@/components/ui';
import { formatDate } from '@/utils';
import type { ActivityItem } from '@/features/activity/services/activityService';

function iconFor(item: ActivityItem): React.ReactNode {
  if (item.severity === 'critical' || item.severity === 'high') return <ShieldAlert className="h-4 w-4" />;
  if (item.severity === 'medium') return <AlertTriangle className="h-4 w-4" />;
  if (item.status === 'VALID') return <CheckCircle2 className="h-4 w-4" />;
  if (item.status === 'INVALID' || item.status === 'REVOKED') return <XCircle className="h-4 w-4" />;
  if (item.status === 'EXPIRED') return <Clock className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

function colorFor(item: ActivityItem): string {
  if (item.severity === 'critical' || item.severity === 'high') return 'bg-danger-50 text-danger-600';
  if (item.severity === 'medium') return 'bg-warning-50 text-warning-600';
  if (item.status === 'VALID') return 'bg-trust-50 text-trust-600';
  if (item.status === 'INVALID' || item.status === 'REVOKED') return 'bg-danger-50 text-danger-600';
  if (item.status === 'EXPIRED') return 'bg-warning-50 text-warning-600';
  return 'bg-securex-50 text-securex-600';
}

export function ActivityFeed({
  items,
  loading = false,
  compact = false,
  emptyMessage = 'No activity yet.',
}: {
  items: ActivityItem[];
  loading?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className={`w-full rounded-xl ${compact ? 'h-14' : 'h-20'}`} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title={emptyMessage}
        description="Activity events will appear here as they occur."
      />
    );
  }

  return (
    <Card padding="none" className="divide-y divide-neutral-100">
      {items.map((item) => (
        <div key={item.id} className={`flex items-start gap-3 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorFor(item)}`}>
            {iconFor(item)}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`font-medium text-neutral-800 ${compact ? 'text-xs' : 'text-sm'}`}>
              {item.title}
            </p>
            {item.description && (
              <p className={`text-neutral-500 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {item.description}
              </p>
            )}
          </div>
          <span className={`shrink-0 text-neutral-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {formatDate(item.timestamp)}
          </span>
        </div>
      ))}
    </Card>
  );
}