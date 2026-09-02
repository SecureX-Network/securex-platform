import { Database, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui';
import { getDataSourceMode, type DataSourceMode } from '../services/explorerService';

export interface DataSourceBadgeProps {
  mode?: DataSourceMode;
}

export function DataSourceBadge({ mode }: DataSourceBadgeProps) {
  const resolved = mode ?? getDataSourceMode();
  if (resolved === 'DEMO') {
    return (
      <Badge
        variant="info"
        icon={<FlaskConical aria-hidden="true" className="h-3 w-3" />}
      >
        Demo data
      </Badge>
    );
  }
  return (
    <Badge
      variant="success"
      icon={<Database aria-hidden="true" className="h-3 w-3" />}
    >
      Live blockchain data
    </Badge>
  );
}