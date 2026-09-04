import { AlertTriangle, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { AttackSeverity } from '../types';

const MAP: Record<
  AttackSeverity,
  { variant: 'default' | 'success' | 'danger' | 'warning' | 'info'; icon: JSX.Element; label: string }
> = {
  LOW: { variant: 'info', icon: <Info aria-hidden="true" className="h-3.5 w-3.5" />, label: 'Low' },
  MEDIUM: { variant: 'default', icon: <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />, label: 'Medium' },
  HIGH: { variant: 'warning', icon: <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />, label: 'High' },
  CRITICAL: { variant: 'danger', icon: <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />, label: 'Critical' },
};

export function SeverityBadge({
  severity,
  size = 'sm',
}: {
  severity: AttackSeverity;
  size?: 'sm' | 'md';
}) {
  const config = MAP[severity];
  return (
    <Badge size={size} variant={config.variant} icon={config.icon}>
      {config.label}
    </Badge>
  );
}
