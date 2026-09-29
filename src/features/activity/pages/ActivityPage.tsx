import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { ActivityFeed } from '@/features/activity/components/ActivityFeed';
import { getActivity } from '@/features/activity/services/activityService';
import type { ActivityItem } from '@/features/activity/services/activityService';

export default function ActivityPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'HOLDER';
  const userId = user?.id ?? '';
  const institutionId = user?.institutionId;
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivity(role, userId, institutionId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [role, userId, institutionId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        subtitle="Credentials, verifications, and security events across your workspace."
      />
      <ActivityFeed items={items} loading={loading} />
    </div>
  );
}