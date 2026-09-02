import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { classNames } from "@/utils";
import { Button } from "./Button";

export interface ErrorStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  icon,
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={classNames(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-10" : "px-6 py-16 sm:py-20",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-500">
        {icon ?? (
          <AlertTriangle aria-hidden="true" className={compact ? "h-6 w-6" : "h-7 w-7"} />
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
      {onRetry && (
        <div className="mt-6">
          <Button variant="outline" size="md" onClick={onRetry}>
            <span className="inline-flex items-center gap-2">
              {retryLabel}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;