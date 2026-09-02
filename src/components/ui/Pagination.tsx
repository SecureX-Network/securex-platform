import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { classNames } from "@/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showing?: {
    from: number;
    to: number;
    total: number;
  };
  showRangeText?: boolean;
  className?: string;
  ariaLabel?: string;
}

function buildPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const specials = Array.from(
    new Set(
      [1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(
        (page) => page >= 1 && page <= totalPages,
      ),
    ),
  ).sort((a, b) => a - b);

  const result: number[] = [];
  for (const page of specials) {
    const last = result[result.length - 1];
    if (last !== undefined && page - last > 1) {
      result.push(-(page - last));
    }
    if (last === page) continue;
    result.push(page);
  }
  return result;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showing,
  showRangeText = true,
  className,
  ariaLabel = "Pagination",
}: PaginationProps) {
  const pages = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  if (totalPages <= 1) return null;

  const pageButtonClasses = (
    active: boolean,
    disabled?: boolean,
  ): string =>
    classNames(
      "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-securex-500",
      active
        ? "border-securex-600 bg-securex-600 text-white"
        : disabled
          ? "cursor-not-allowed border-neutral-200 bg-white text-neutral-300"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
    );

  return (
    <nav
      role="navigation"
      aria-label={ariaLabel}
      className={classNames(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      {showRangeText && showing ? (
        <span className="text-sm text-neutral-500">
          Showing{" "}
          <span className="font-medium text-neutral-800">{showing.from}</span>–
          <span className="font-medium text-neutral-800">{showing.to}</span> of{" "}
          <span className="font-medium text-neutral-800">{showing.total}</span>
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Go to first page"
          className={pageButtonClasses(false, currentPage === 1)}
        >
          <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
          className={pageButtonClasses(false, currentPage === 1)}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="mx-1 flex items-center gap-1.5">
          {pages.map((page, index) => {
            if (page < 0) {
              return (
                <span
                  key={`gap-${index}`}
                  aria-hidden="true"
                  className="px-0.5 text-sm text-neutral-400"
                >
                  …
                </span>
              );
            }
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
                aria-label={`Page ${page}`}
                className={pageButtonClasses(page === currentPage)}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
          className={pageButtonClasses(false, currentPage === totalPages)}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
          className={pageButtonClasses(false, currentPage === totalPages)}
        >
          <ChevronsRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;