import type { ReactNode } from 'react';
import {
  CheckCircle2,
  ShieldAlert,
  ShieldX,
  Timer,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import type { EvidenceStatusValue } from '../types';

type StatusValue = EvidenceStatusValue;

const LABELS: Record<StatusValue, string> = {
  VALID: 'Valid',
  INVALID: 'Invalid',
  REJECTED: 'Rejected',
  DETECTED: 'Detected',
  BLOCKED: 'Blocked',
  FAILED: 'Failed',
  COMPLETED: 'Completed',
  PENDING: 'Pending',
};

const VARIANTS: Record<
  StatusValue,
  'success' | 'danger' | 'warning' | 'info' | 'purple'
> = {
  VALID: 'success',
  INVALID: 'danger',
  REJECTED: 'danger',
  DETECTED: 'warning',
  BLOCKED: 'warning',
  FAILED: 'danger',
  COMPLETED: 'success',
  PENDING: 'info',
};

const ICONS: Record<StatusValue, ReactNode> = {
  VALID: <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />,
  INVALID: <ShieldX aria-hidden="true" className="h-3.5 w-3.5" />,
  REJECTED: <ShieldX aria-hidden="true" className="h-3.5 w-3.5" />,
  DETECTED: <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />,
  BLOCKED: <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />,
  FAILED: <ShieldX aria-hidden="true" className="h-3.5 w-3.5" />,
  COMPLETED: <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />,
  PENDING: <Timer aria-hidden="true" className="h-3.5 w-3.5" />,
};

export function EvidenceStatus({
  status,
  size = 'sm',
}: {
  status: StatusValue;
  size?: 'sm' | 'md';
}) {
  const value: StatusValue = LABELS[status] ? status : 'PENDING';
  return (
    <Badge size={size} variant={VARIANTS[value]} icon={ICONS[value]}>
      {LABELS[value]}
    </Badge>
  );
}

export const STATUS_LABELS = LABELS;
export const STATUS_VARIANTS = VARIANTS;