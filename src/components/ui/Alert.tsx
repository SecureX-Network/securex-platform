import { forwardRef, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { classNames } from "@/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  dismissible?: boolean;
  onClose?: () => void;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

const variantConfig: Record<
  AlertVariant,
  {
    wrapper: string;
    title: string;
    description: string;
    iconColor: string;
    closeHover: string;
    defaultIcon: ReactNode;
    role: "alert" | "status";
  }
> = {
  info: {
    wrapper: "border-securex-200 bg-securex-50",
    title: "text-securex-800",
    description: "text-securex-700/80",
    iconColor: "text-securex-600",
    closeHover: "hover:bg-securex-100 hover:text-securex-700",
    defaultIcon: <Info aria-hidden="true" className="h-5 w-5" />,
    role: "status",
  },
  success: {
    wrapper: "border-trust-200 bg-trust-50",
    title: "text-trust-800",
    description: "text-trust-700/80",
    iconColor: "text-trust-600",
    closeHover: "hover:bg-trust-100 hover:text-trust-700",
    defaultIcon: <CheckCircle2 aria-hidden="true" className="h-5 w-5" />,
    role: "status",
  },
  warning: {
    wrapper: "border-warning-200 bg-warning-50",
    title: "text-warning-800",
    description: "text-warning-700/80",
    iconColor: "text-warning-600",
    closeHover: "hover:bg-warning-100 hover:text-warning-800",
    defaultIcon: <AlertTriangle aria-hidden="true" className="h-5 w-5" />,
    role: "alert",
  },
  error: {
    wrapper: "border-danger-200 bg-danger-50",
    title: "text-danger-800",
    description: "text-danger-700/80",
    iconColor: "text-danger-600",
    closeHover: "hover:bg-danger-100 hover:text-danger-700",
    defaultIcon: <AlertCircle aria-hidden="true" className="h-5 w-5" />,
    role: "alert",
  },
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    variant = "info",
    title,
    description,
    icon,
    dismissible = false,
    onClose,
    action,
    className,
    children,
  },
  ref,
) {
  const config = variantConfig[variant];

  return (
    <div
      ref={ref}
      role={config.role}
      className={classNames(
        "flex items-start gap-3 rounded-xl border p-4",
        config.wrapper,
        className,
      )}
    >
      <div className={classNames("mt-0.5 shrink-0", config.iconColor)}>
        {icon ?? config.defaultIcon}
      </div>
      <div className="min-w-0 flex-1">
        {title && (
          <div className={classNames("text-sm font-semibold", config.title)}>
            {title}
          </div>
        )}
        {(description || children) && (
          <div
            className={classNames(
              "mt-0.5 text-sm",
              config.description,
              !title && config.title,
            )}
          >
            {description ?? children}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {(dismissible || onClose) && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className={classNames(
            "-mr-1 -mt-1 shrink-0 rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
            config.closeHover,
          )}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

export default Alert;