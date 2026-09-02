import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { classNames } from "@/utils";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  size?: "sm" | "md";
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      label,
      description,
      indeterminate = false,
      size = "md",
      id,
      disabled,
      className,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const boxSize = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className={classNames("flex items-start", className)}>
        <div className="flex h-5 shrink-0 items-center">
          <input
            ref={(node) => {
                inputRef.current = node;
                if (typeof ref === "function") {
                  ref(node);
                } else if (ref) {
                  ref.current = node;
                }
              }}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            aria-checked={indeterminate ? "mixed" : undefined}
            className={classNames(
              boxSize,
              "cursor-pointer rounded border-neutral-300 bg-white text-securex-600 transition-colors focus:ring-2 focus:ring-securex-500 disabled:cursor-not-allowed disabled:opacity-60",
            )}
            {...rest}
          />
        </div>
        {(label || description) && (
          <div className="ml-2.5 leading-snug">
            {label && (
              <label
                htmlFor={inputId}
                className={classNames(
                  "block text-sm font-medium text-neutral-800",
                  disabled && "cursor-not-allowed text-neutral-400",
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                className={classNames(
                  "mt-0.5 block text-xs text-neutral-500",
                  disabled && "text-neutral-400",
                )}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

export default Checkbox;