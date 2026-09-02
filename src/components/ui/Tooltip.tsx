import { useId, useRef, useState, type ReactNode } from "react";
import { classNames } from "@/utils";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 150,
  disabled = false,
  className,
  containerClassName,
}: TooltipProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (disabled) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 50);
  };

  const positionClasses: Record<TooltipPosition, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<TooltipPosition, string> = {
    top: "bottom-[-4px] left-1/2 -translate-x-1/2 rotate-45 border-r border-b",
    bottom: "top-[-4px] left-1/2 -translate-x-1/2 rotate-45 border-l border-t",
    left: "right-[-4px] top-1/2 -translate-y-1/2 rotate-45 border-r border-t",
    right: "left-[-4px] top-1/2 -translate-y-1/2 rotate-45 border-l border-b",
  };

  return (
    <span
      className={classNames("group/tooltip relative inline-flex", containerClassName)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && !disabled && (
        <span
          id={id}
          role="tooltip"
          className={classNames(
            "pointer-events-none absolute z-40 animate-securex-fade-in rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-securex-md",
            positionClasses[position],
            className,
          )}
        >
          {content}
          <span
            aria-hidden="true"
            className={classNames(
              "absolute h-2 w-2 bg-neutral-900",
              arrowClasses[position],
            )}
          />
        </span>
      )}
    </span>
  );
}

export default Tooltip;