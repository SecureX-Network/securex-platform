import { classNames } from "@/utils";
import { IS_MOCK } from "@/constants";

export interface ModeIndicatorProps {
  className?: string;
}

export function ModeIndicator({ className }: ModeIndicatorProps) {
  const isDemo = IS_MOCK;
  return (
    <span
      data-testid="mode-indicator"
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        isDemo
          ? "bg-amber-50 text-amber-700 ring-amber-600/30"
          : "bg-trust-50 text-trust-700 ring-trust-600/30",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={classNames(
          "h-1.5 w-1.5 rounded-full",
          isDemo ? "bg-amber-500" : "bg-trust-500",
        )}
      />
      {isDemo ? "DEMO" : "REAL"}
    </span>
  );
}

export default ModeIndicator;
