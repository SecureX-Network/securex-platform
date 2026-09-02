import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { classNames } from "@/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-securex-600 text-white hover:bg-securex-700 focus-visible:ring-securex-500 shadow-sm",
  secondary:
    "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-500 shadow-sm",
  outline:
    "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:ring-securex-500",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-securex-500",
  danger:
    "bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-6 text-base gap-2 rounded-lg",
};

const spinnerSizes: Record<ButtonSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export type ButtonProps = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

export type LinkButtonProps = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

type CombinedProps = ButtonProps | LinkButtonProps;

export function Button(props: CombinedProps) {
  const {
    variant = "primary",
    size = "md",
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    ...rest
  } = props;

  const classes = classNames(
    "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 shrink-0 whitespace-nowrap select-none",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );

  const spinner = isLoading ? (
    <LoaderCircle
      aria-hidden="true"
      className={classNames(spinnerSizes[size], "animate-spin")}
    />
  ) : null;

  if ("href" in props && props.href !== undefined) {
    const { target, rel, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    const href = props.href;
    const external = target === "_blank";

    return (
      <a
        href={href}
        target={target}
        rel={external ? (rel ?? "noopener noreferrer") : rel}
        aria-busy={isLoading || undefined}
        aria-disabled={isLoading || undefined}
        className={classNames(classes, isLoading && "pointer-events-none")}
        {...anchorRest}
      >
        {spinner}
        {!isLoading && leftIcon}
        {children}
        {rightIcon}
      </a>
    );
  }

  const { type = "button", disabled, ...buttonRest } =
    rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
      {...buttonRest}
    >
      {spinner}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}

export default Button;