import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { classNames } from "@/utils";
import { Button, type ButtonProps } from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  actionButton?: Omit<ButtonProps, "children"> & { label: ReactNode };
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title = "Nothing here yet",
  description,
  action,
  actionButton,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={classNames(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-10" : "px-6 py-16 sm:py-20",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        {icon ?? (
          <Inbox aria-hidden="true" className={compact ? "h-6 w-6" : "h-7 w-7"} />
        )}
      </div>
      {title && (
        <h3
          className={classNames(
            "mt-4 font-semibold text-neutral-900",
            compact ? "text-base" : "text-lg",
          )}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          className={classNames(
            "mt-1.5 max-w-sm text-neutral-500",
            compact ? "text-sm" : "text-sm leading-relaxed",
          )}
        >
          {description}
        </p>
      )}
      {(action || actionButton) && (
        <div className="mt-6">
          {action ?? (
            <Button size="md" variant="primary" {...actionButton}>
              {actionButton?.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;