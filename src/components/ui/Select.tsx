import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { classNames } from "@/utils";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 text-xs rounded-lg",
  md: "h-10 text-sm rounded-lg",
  lg: "h-11 text-base rounded-lg",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      error,
      helperText,
      options = [],
      placeholder,
      size = "md",
      id,
      defaultValue,
      disabled,
      className,
      "aria-describedby": ariaDescribedBy,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const selectId = id ?? autoId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;
    const describedBy =
      [
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
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            defaultValue={defaultValue ?? (placeholder ? "" : undefined)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={classNames(
              "w-full cursor-pointer appearance-none border bg-white pr-9 text-neutral-900 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
              sizeClasses[size],
              error
                ? "border-danger-300 focus:border-danger-500 focus:ring-danger-100"
                : "border-neutral-300 hover:border-neutral-400 focus:border-securex-500 focus:ring-securex-100",
            )}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className={classNames(
              "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400",
              size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4",
            )}
          />
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-danger-600"
          >
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
  },
);

export default Select;