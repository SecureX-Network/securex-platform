import type { ReactNode } from "react";
import { classNames } from "@/utils";

export type BadgeVariant =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "purple";

export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  label?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-neutral-100 text-neutral-700 ring-neutral-500/20",
  success: "bg-trust-50 text-trust-700 ring-trust-600/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-600/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-600/20",
  info: "bg-securex-50 text-securex-700 ring-securex-600/20",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-[11px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

const dotClasses: Record<BadgeVariant, string> = {
  default: "bg-neutral-400",
  success: "bg-trust-500",
  danger: "bg-danger-500",
  warning: "bg-warning-500",
  info: "bg-securex-600",
  purple: "bg-purple-500",
};

const iconSizes: Record<BadgeSize, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
};

export function Badge({
  variant = "default",
  size = "md",
  label,
  children,
  icon,
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={classNames(
            "h-1.5 w-1.5 rounded-full",
            dotClasses[variant],
          )}
        />
      )}
      {icon && (
        <span aria-hidden="true" className={iconSizes[size]}>
          {icon}
        </span>
      )}
      {label ?? children}
    </span>
  );
}

export default Badge;