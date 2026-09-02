import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { classNames } from "@/utils";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 text-xs rounded-lg",
  md: "h-10 text-sm rounded-lg",
  lg: "h-11 text-base rounded-lg",
};

const leftPadding = {
  sm: "pl-8",
  md: "pl-9",
  lg: "pl-10",
};

const rightPadding = {
  sm: "pr-8",
  md: "pr-9",
  lg: "pr-10",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    size = "md",
    id,
    disabled,
    className,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = [
    ariaDescribedBy,
    error ? errorId : null,
    !error && helperText ? helperId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={classNames("w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-neutral-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span
            className={classNames(
              "pointer-events-none absolute inset-y-0 left-3 flex items-center",
              size === "sm" ? "text-neutral-400" : "text-neutral-500",
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={classNames(
            "w-full border bg-white text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 disabled:placeholder:text-neutral-400",
            sizeClasses[size],
            leftIcon && leftPadding[size],
            rightIcon && rightPadding[size],
            error
              ? "border-danger-300 focus:border-danger-500 focus:ring-danger-100"
              : "border-neutral-300 hover:border-neutral-400 focus:border-securex-500 focus:ring-securex-100",
          )}
          {...rest}
        />
        {rightIcon && (
          <span
            className={classNames(
              "pointer-events-none absolute inset-y-0 right-3 flex items-center",
              size === "sm" ? "text-neutral-400" : "text-neutral-500",
            )}
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-danger-600">
          <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="mt-1.5 text-xs text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;