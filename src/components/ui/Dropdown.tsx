import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { classNames } from "@/utils";
import { Spinner } from "./Spinner";

export interface DropdownItemData {
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
  loading?: boolean;
}

export type DropdownItemType =
  | (DropdownItemData & { type?: "item" })
  | { type: "separator" };

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItemType[];
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
  closeOnSelect?: boolean;
  ariaLabel?: string;
}

type ItemEntry = DropdownItemData & { type?: "item" };

const itemClasses = (item: ItemEntry): string =>
  classNames(
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none",
    item.disabled
      ? "cursor-not-allowed text-neutral-400"
      : item.danger
        ? "text-danger-600 hover:bg-danger-50 focus:bg-danger-50"
        : "text-neutral-700 hover:bg-neutral-100 focus:bg-neutral-100",
  );

export function Dropdown({
  trigger,
  items,
  align = "left",
  className,
  menuClassName,
  closeOnSelect = true,
  ariaLabel,
}: DropdownProps) {
  const buttonId = useId();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectableItems = items.filter(
    (item): item is ItemEntry => item.type !== "separator",
  );
  const enabledIndices = selectableItems
    .map((item, index) => (!item.disabled ? index : -1))
    .filter((index) => index >= 0);

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
  }, []);

  const handleSelect = (item: ItemEntry) => {
    if (item.disabled) return;
    item.onSelect?.();
    if (closeOnSelect) close();
  };

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        wrapperRef.current
          ?.querySelector<HTMLButtonElement>("[data-dropdown-trigger]")
          ?.focus();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const element = menuRef.current?.querySelector<HTMLElement>(
      `[data-dropdown-item="${focusedIndex}"]`,
    );
    element?.focus();
  }, [open, focusedIndex]);

  const moveFocus = (direction: 1 | -1) => {
    if (enabledIndices.length === 0) return;
    const current = enabledIndices.indexOf(focusedIndex);
    const next =
      current === -1
        ? direction === 1
          ? (enabledIndices[0] ?? -1)
          : (enabledIndices[enabledIndices.length - 1] ?? -1)
        : (enabledIndices[
            (current + direction + enabledIndices.length) %
              enabledIndices.length
          ] ?? -1);
    setFocusedIndex(next);
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen((value) => !value);
      if (!open) {
        setFocusedIndex(enabledIndices[0] ?? -1);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setFocusedIndex(enabledIndices[enabledIndices.length - 1] ?? -1);
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-1);
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(enabledIndices[0] ?? -1);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(enabledIndices[enabledIndices.length - 1] ?? -1);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const targetItem = selectableItems[focusedIndex];
        if (targetItem && !targetItem.disabled) handleSelect(targetItem);
        break;
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={classNames("relative inline-block", className)}
    >
      <button
        type="button"
        id={buttonId}
        data-dropdown-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-securex-500"
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          onKeyDown={handleMenuKeyDown}
          className={classNames(
            "absolute z-30 mt-1.5 min-w-[10rem] rounded-lg border border-neutral-200 bg-white p-1 shadow-securex-lg animate-securex-scale-in",
            align === "right" ? "right-0" : "left-0",
            menuClassName,
          )}
        >
          {items.map((item, index) => {
            if (item.type === "separator") {
              return (
                <div
                  key={index}
                  role="separator"
                  className="my-1 h-px bg-neutral-200"
                />
              );
            }

            const { label, icon, disabled, shortcut, loading } = item;

            return (
              <button
                key={index}
                type="button"
                role="menuitem"
                data-dropdown-item={index}
                tabIndex={-1}
                disabled={disabled || loading}
                onClick={() => handleSelect(item)}
                className={itemClasses(item)}
              >
                {loading ? (
                  <Spinner
                    size="sm"
                    className="text-neutral-400"
                    label="Loading"
                  />
                ) : (
                  icon && (
                    <span aria-hidden="true" className="h-4 w-4 shrink-0">
                      {icon}
                    </span>
                  )
                )}
                <span className="flex-1 truncate">{label}</span>
                {shortcut && (
                  <kbd className="ml-auto rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                    {shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DropdownTrigger({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <ChevronDown aria-hidden="true" className="h-4 w-4 text-neutral-500" />
    </span>
  );
}

export default Dropdown;