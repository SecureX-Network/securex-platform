import type { ReactNode } from "react";
import { AlertTriangle, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { classNames } from "@/utils";

export type DialogVariant = "danger" | "info";

export interface DialogProps {
  open: boolean;
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLoading?: boolean;
  hideCancel?: boolean;
  className?: string;
}

const variantConfig: Record<
  DialogVariant,
  {
    icon: ReactNode;
    iconWrapper: string;
    confirmVariant: "danger" | "primary";
  }
> = {
  danger: {
    icon: (
      <XCircle aria-hidden="true" className="h-6 w-6 text-danger-600" />
    ),
    iconWrapper: "bg-danger-50 text-danger-600",
    confirmVariant: "danger",
  },
  info: {
    icon: <ShieldCheck aria-hidden="true" className="h-6 w-6 text-securex-600" />,
    iconWrapper: "bg-securex-50 text-securex-600",
    confirmVariant: "primary",
  },
};

export function Dialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
  confirmLoading = false,
  hideCancel = false,
  className,
}: DialogProps) {
  const config = variantConfig[variant];

  return (
    <Modal
      open={open}
      onClose={onCancel}
      hideCloseButton={true}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      size="sm"
      className={className}
      role="alertdialog"
    >
      <div className="flex items-start gap-4">
        <div
          className={classNames(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            config.iconWrapper,
          )}
        >
          {variant === "danger" ? (
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          ) : (
            config.icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          {title && (
            <h2 className="text-base font-semibold text-neutral-900">
              {title}
            </h2>
          )}
          {message && (
            <div className="mt-1 text-sm leading-relaxed text-neutral-500">
              {message}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        {!hideCancel && (
          <Button variant="outline" onClick={onCancel} disabled={confirmLoading}>
            {cancelLabel}
          </Button>
        )}
        <Button
          variant={config.confirmVariant}
          onClick={onConfirm}
          isLoading={confirmLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default Dialog;