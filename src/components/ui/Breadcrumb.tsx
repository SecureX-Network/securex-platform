import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { classNames } from "@/utils";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  active?: boolean;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Breadcrumb({
  items,
  separator,
  className,
  ariaLabel = "Breadcrumb",
}: BreadcrumbProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const active = item.active ?? isLast;

          return (
            <li
              key={index}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-1.5"
            >
              {index > 0 &&
                (separator ? (
                  <span
                    aria-hidden="true"
                    className="mr-1.5 text-neutral-400"
                  >
                    {separator}
                  </span>
                ) : (
                  <ChevronRight
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4 text-neutral-400"
                  />
                ))}
              {item.href && !active ? (
                <a
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded text-neutral-500 transition-colors hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-securex-500"
                >
                  {item.icon && (
                    <span aria-hidden="true" className="h-3.5 w-3.5">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </a>
              ) : (
                <span
                  className={classNames(
                    "inline-flex max-w-40 items-center gap-1.5 truncate font-medium",
                    active ? "text-neutral-900" : "text-neutral-500",
                  )}
                >
                  {item.icon && (
                    <span aria-hidden="true" className="h-3.5 w-3.5">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;