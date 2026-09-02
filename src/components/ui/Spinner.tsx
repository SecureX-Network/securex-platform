import { LoaderCircle } from "lucide-react";
import { classNames } from "@/utils";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  label?: string;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-9 w-9",
};

export function Spinner({
  size = "md",
  color = "currentColor",
  label = "Loading",
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={classNames("inline-flex items-center justify-center", className)}
    >
      <LoaderCircle
        aria-hidden="true"
        className={classNames(sizeClasses[size], "animate-spin")}
        style={{ color }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default Spinner;