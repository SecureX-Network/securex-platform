import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { classNames } from "@/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  hideCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  role?: "dialog" | "alertdialog";
  labelledById?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.tabIndex !== -1,
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  hideCloseButton = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  initialFocusRef,
  role = "dialog",
  labelledById,
}: ModalProps) {
  const autoTitleId = useId();
  const autoDescriptionId = useId();
  const titleId = labelledById ?? (title ? autoTitleId : undefined);
  const descriptionId = description ? autoDescriptionId : undefined;

  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        if (closeOnEscape) {
          event.stopPropagation();
          onClose();
        }
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.setAttribute("tabindex", "-1");
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === panelRef.current || !focusable.includes(active as HTMLElement)) {
          event.preventDefault();
          last?.focus();
        }
      } else if (active === last || active === panelRef.current || !focusable.includes(active as HTMLElement)) {
        event.preventDefault();
        first?.focus();
      }
    },
    [open, closeOnEscape, onClose],
  );

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    const frame = requestAnimationFrame(() => {
      const target =
        initialFocusRef?.current ??
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (target ?? panelRef.current)?.focus();
    });

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown, initialFocusRef]);

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-neutral-950/50 animate-securex-fade-in"
        aria-hidden="true"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={classNames(
          "relative z-10 flex max-h-[calc(100vh-2rem)] w-full flex-col bg-white shadow-securex-xl outline-none animate-securex-scale-in rounded-t-2xl sm:rounded-xl",
          sizeClasses[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="shrink-0 border-b border-neutral-100 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h2
                    id={titleId}
                    className="text-lg font-semibold leading-6 text-neutral-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id={descriptionId}
                    className="mt-1 text-sm text-neutral-500"
                  >
                    {description}
                  </p>
                )}
              </div>
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-mr-1.5 shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-securex-500"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}
        {children && (
          <div className="shrink grow overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>
        )}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/60 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default Modal;