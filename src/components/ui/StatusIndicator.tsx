import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import type { CredentialStatus } from "@/types";
import { classNames } from "@/utils";

export type StatusIndicatorSize = "sm" | "md" | "lg";

export interface StatusIndicatorProps {
  status: CredentialStatus;
  size?: StatusIndicatorSize;
  showLabel?: boolean;
  label?: ReactNode;
  className?: string;
}

const statusConfig: Record<
  CredentialStatus,
  {
    label: string;
    dot: (sizeClass: string) => string;
    icon: ReactNode;
    iconColor: string;
  }
> = {
  VALID: {
    label: "Valid",
    dot: (s) => classNames(s, "bg-trust-500"),
    icon: <CheckCircle2 aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-trust-600",
  },
  INVALID: {
    label: "Invalid",
    dot: (s) => classNames(s, "bg-danger-500"),
    icon: <ShieldX aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-danger-600",
  },
  REVOKED: {
    label: "Revoked",
    dot: (s) => classNames(s, "bg-danger-500"),
    icon: <ShieldX aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-danger-600",
  },
  SUSPENDED: {
    label: "Suspended",
    dot: (s) => classNames(s, "bg-warning-500"),
    icon: <ShieldAlert aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-warning-600",
  },
  EXPIRED: {
    label: "Expired",
    dot: (s) => classNames(s, "bg-neutral-400"),
    icon: <Clock aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-neutral-500",
  },
  TAMPERED: {
    label: "Tampered",
    dot: (s) => classNames(s, "bg-danger-500"),
    icon: <ShieldX aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-danger-600",
  },
  SUSPICIOUS: {
    label: "Suspicious",
    dot: (s) => classNames(s, "bg-warning-500"),
    icon: <AlertTriangle aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-warning-600",
  },
  NOT_FOUND: {
    label: "Not Found",
    dot: (s) => classNames(s, "bg-neutral-400"),
    icon: <HelpCircle aria-hidden="true" className="h-4 w-4" />,
    iconColor: "text-neutral-500",
  },
};

const sizeDotClasses: Record<StatusIndicatorSize, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

const sizeTextClasses: Record<StatusIndicatorSize, string> = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
};

const labelColor: Record<
  CredentialStatus,
  { sm: string; md: string; lg: string }
> = {
  VALID: { sm: "text-trust-700", md: "text-trust-700", lg: "text-trust-800" },
  INVALID: { sm: "text-danger-700", md: "text-danger-700", lg: "text-danger-800" },
  REVOKED: { sm: "text-danger-700", md: "text-danger-700", lg: "text-danger-800" },
  SUSPENDED: { sm: "text-warning-700", md: "text-warning-700", lg: "text-warning-800" },
  EXPIRED: { sm: "text-neutral-500", md: "text-neutral-500", lg: "text-neutral-600" },
  TAMPERED: { sm: "text-danger-700", md: "text-danger-700", lg: "text-danger-800" },
  SUSPICIOUS: { sm: "text-warning-700", md: "text-warning-700", lg: "text-warning-800" },
  NOT_FOUND: { sm: "text-neutral-500", md: "text-neutral-500", lg: "text-neutral-600" },
};

export function StatusIndicator({
  status,
  size = "md",
  showLabel = true,
  label,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const dotSize = sizeDotClasses[size];

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 align-middle",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={classNames("shrink-0 rounded-full", config.dot(dotSize))}
      />
      {showLabel && (
        <span
          className={classNames(
            "font-medium",
            sizeTextClasses[size],
            labelColor[status][size],
          )}
        >
          {label ?? config.label}
        </span>
      )}
    </span>
  );
}

export default StatusIndicator;