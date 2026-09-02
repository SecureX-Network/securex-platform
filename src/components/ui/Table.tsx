import {
  useMemo,
  useState,
  type HTMLProps,
  type ReactNode,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
} from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from "lucide-react";
import { classNames } from "@/utils";
import { Skeleton } from "./Skeleton";

export type SortDirection = "asc" | "desc";

export type ColumnAlign = "left" | "center" | "right";

export interface Column<T> {
  key: string;
  header: ReactNode;
  accessor?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  sortable?: boolean;
  align?: ColumnAlign;
  width?: string;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSortChange?: (columnKey: string, direction: SortDirection) => void;
  defaultSortColumn?: string;
  defaultSortDirection?: SortDirection;
  ariaLabel?: string;
  className?: string;
  dense?: boolean;
}

interface SortIconProps {
  active: boolean;
  direction: SortDirection;
}

function SortIcon({ active, direction }: SortIconProps) {
  if (!active) {
    return (
      <ArrowUpDown
        aria-hidden="true"
        className="h-3.5 w-3.5 text-neutral-400"
      />
    );
  }
  const Icon = direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <Icon
      aria-hidden="true"
      className="h-3.5 w-3.5 text-securex-600"
    />
  );
}

function rawValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function primitiveValue(value: unknown): string | number | boolean | null {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

export function TableHead({
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={classNames(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={classNames(
        "px-4 py-3.5 text-sm text-neutral-700 align-middle",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

export function TableRow({
  className,
  children,
  ...rest
}: HTMLProps<HTMLTableRowElement>) {
  return (
    <tr
      className={classNames(
        "border-b border-neutral-100 last:border-0",
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableHeader<T>({
  columns,
  sortColumn,
  sortDirection,
  onSortHeaderClick,
}: {
  columns: Column<T>[];
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSortHeaderClick?: (column: Column<T>) => void;
}) {
  return (
    <thead className="bg-neutral-50/80">
      <tr>
        {columns.map((column) => {
          const active = Boolean(column.sortable && sortColumn === column.key);
          return (
            <TableHead
              key={column.key}
              aria-sort={
                sortColumn === column.key
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : column.sortable
                    ? "none"
                    : undefined
              }
              className={classNames(
                column.align === "center" && "text-center",
                column.align === "right" && "text-right",
                column.width,
                column.headerClassName,
              )}
            >
              {column.sortable ? (
                <button
                  type="button"
                  onClick={() => onSortHeaderClick?.(column)}
                  className={classNames(
                    "group inline-flex items-center gap-1 rounded font-semibold uppercase tracking-wider text-neutral-500 transition-colors hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-securex-500",
                    column.align === "right" && "flex-row-reverse",
                    column.align === "center" && "justify-center",
                  )}
                >
                  {column.header}
                  <SortIcon
                    active={active}
                    direction={sortDirection ?? "asc"}
                  />
                </button>
              ) : (
                column.header
              )}
            </TableHead>
          );
        })}
      </tr>
    </thead>
  );
}

export function TableBody<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyState,
}: {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
}) {
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <TableCell
            colSpan={columns.length}
            className="px-4 py-16 text-center"
          >
            {emptyState ?? (
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <Inbox aria-hidden="true" className="h-10 w-10" />
                <span className="text-sm font-medium">No results found</span>
              </div>
            )}
          </TableCell>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-neutral-100">
      {data.map((row, index) => {
        const rowCls = classNames(
          "transition-colors",
          onRowClick &&
            "cursor-pointer hover:bg-neutral-50 focus-within:bg-neutral-50",
        );
        const content = columns.map((column) => {
          const render = column.accessor ?? ((r: T) => {
            const value = rawValue(r, column.key);
            return typeof value === "object" && value !== null
              ? null
              : (value as ReactNode);
          });
          return (
            <TableCell
              key={column.key}
              className={classNames(
                column.align === "center" && "text-center",
                column.align === "right" && "text-right",
                column.className,
              )}
            >
              {render(row)}
            </TableCell>
          );
        });

        return (
          <TableRow
            key={rowKey(row, index)}
            className={rowCls}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {content}
          </TableRow>
        );
      })}
    </tbody>
  );
}

export function TableSkeletonRow({
  columns,
  dense,
}: {
  columns: readonly { key: string; width?: string }[];
  dense?: boolean;
}) {
  return (
    <TableRow>
      {columns.map((column) => (
        <TableCell
          key={column.key}
          className={classNames(dense && "py-2.5", column.width)}
        >
          <Skeleton className="h-4 w-24" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyState,
  onRowClick,
  sortColumn,
  sortDirection,
  onSortChange,
  defaultSortColumn,
  defaultSortDirection = "asc",
  ariaLabel,
  className,
  dense = false,
}: TableProps<T>) {
  const internalInitial = useMemo(
    () => ({
      key: defaultSortColumn,
      direction: defaultSortDirection,
    }),
    [defaultSortColumn, defaultSortDirection],
  );
  const [internalSort, setInternalSort] = useState(internalInitial);

  const isControlled = onSortChange !== undefined;
  const activeColumn = sortColumn ?? internalSort.key;
  const activeDirection = sortDirection ?? internalSort.direction;

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    const nextDirection =
      activeColumn === column.key && activeDirection === "asc" ? "desc" : "asc";
    if (isControlled) {
      onSortChange(column.key, nextDirection);
    } else {
      setInternalSort({ key: column.key, direction: nextDirection });
    }
  };

  const rows = useMemo(() => {
    if (isControlled || !activeColumn || !activeDirection) return data;
    const column = columns.find((c) => c.key === activeColumn);
    if (!column || !column.sortable) return data;

    const sortAccessor =
      column.sortValue ??
      ((row: T) => primitiveValue(rawValue(row, column.key)));

    return [...data].sort((a, b) => {
      const av = sortAccessor(a);
      const bv = sortAccessor(b);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return activeDirection === "asc" ? cmp : -cmp;
    });
  }, [
    data,
    columns,
    isControlled,
    activeColumn,
    activeDirection,
  ]);

  return (
    <div
      className={classNames(
        "w-full overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-securex",
        className,
      )}
    >
      <table
        aria-label={ariaLabel}
        className="min-w-full border-collapse text-left"
      >
        <TableHeader
          columns={columns}
          sortColumn={activeColumn}
          sortDirection={activeDirection}
          onSortHeaderClick={handleSort}
        />
        {loading ? (
          <tbody>
            {Array.from({ length: dense ? 3 : 5 }, (_, i) => (
              <TableSkeletonRow key={i} columns={columns} dense={dense} />
            ))}
          </tbody>
        ) : (
          <TableBody
            columns={columns}
            data={rows}
            rowKey={rowKey}
            onRowClick={onRowClick}
            emptyState={emptyState}
          />
        )}
      </table>
    </div>
  );
}

export default Table;