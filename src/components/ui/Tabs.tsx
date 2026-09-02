import { useId, type KeyboardEvent, type ReactNode } from "react";
import { classNames } from "@/utils";

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  content?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
  listClassName?: string;
  panelClassName?: string;
  children?: ReactNode;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
  listClassName,
  panelClassName,
  children,
}: TabsProps) {
  const listId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = tabs.filter((tab) => !tab.disabled);
    if (
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) ||
      enabled.length === 0
    ) {
      return;
    }

    const current = Math.max(
      0,
      enabled.findIndex((tab) => tab.id === activeTab),
    );
    let next = current;

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const step = event.key === "ArrowRight" ? 1 : -1;
      next = (current + step + enabled.length) % enabled.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = enabled.length - 1;
    }

    const target = event.currentTarget.querySelector<HTMLElement>(
      `#${listId}-tab-${enabled[next]?.id}`,
    );
    target?.focus();
    onChange(enabled[next]?.id ?? activeTab);
    event.preventDefault();
  };

  const activePanel = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className={classNames("w-full", className)}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className={classNames(
          "flex gap-1",
          variant === "pills" ? "flex-wrap" : "border-b border-neutral-200",
          listClassName,
        )}
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={`${listId}-tab-${tab.id}`}
              role="tab"
              aria-selected={selected}
              aria-controls={`${listId}-panel`}
              aria-disabled={tab.disabled || undefined}
              tabIndex={selected ? 0 : -1}
              type="button"
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={classNames(
                "inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-securex-500",
                variant === "underline"
                  ? classNames(
                      "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium",
                      selected
                        ? "border-securex-600 text-securex-700"
                        : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800",
                    )
                  : classNames(
                      "rounded-lg px-3.5 py-2 text-sm font-medium",
                      selected
                        ? "bg-securex-50 text-securex-700"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                    ),
                tab.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {tab.icon && (
                <span aria-hidden="true" className="h-4 w-4">
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
          id={`${listId}-panel`}
          role="tabpanel"
          aria-labelledby={`${listId}-tab-${activeTab}`}
          tabIndex={0}
          className={classNames(
            "mt-4 focus-visible:outline-none",
            panelClassName,
          )}
        >
          {activePanel?.content ?? children}
        </div>
    </div>
  );
}

export default Tabs;