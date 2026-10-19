import type { ReactNode } from "react";
import { cx } from "./cx";

export interface DataTableColumn {
  key: string;
  header: string;
  numeric?: boolean;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  testId?: string;
  caption?: string;
  emptyState?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function DataTable({
  columns,
  testId,
  caption,
  emptyState,
  className,
  children,
}: DataTableProps) {
  if (children === undefined && emptyState !== undefined) {
    return <div data-testid={testId}>{emptyState}</div>;
  }

  return (
    <div
      data-testid={testId}
      className={cx("overflow-x-auto rounded-lg border border-border bg-surface", className)}
    >
      <table className="w-full min-w-[36rem] border-collapse text-body">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="sticky top-0 z-[var(--ui-z-sticky)] bg-secondary shadow-[var(--ui-shadow-raised)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  "border-b border-border px-4 py-3 text-caption leading-caption font-semibold whitespace-nowrap text-body-secondary",
                  column.numeric ? "text-right" : "text-left",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export interface DataTableRowProps {
  rowKey: string;
  onClick?: () => void;
  children: ReactNode;
}

export function DataTableRow({ rowKey, onClick, children }: DataTableRowProps) {
  return (
    <tr
      data-row-key={rowKey}
      onClick={onClick}
      className={cx(
        "border-b border-border transition-[background-color] duration-fast ease-out last:border-b-0 hover:bg-secondary/50 motion-reduce:transition-none",
        onClick !== undefined && "cursor-pointer",
      )}
    >
      {children}
    </tr>
  );
}

export interface DataTableCellProps {
  numeric?: boolean;
  link?: boolean;
  href?: string;
  linkTestId?: string;
  children: ReactNode;
}

export function DataTableCell({ numeric = false, link = false, href, linkTestId, children }: DataTableCellProps) {
  return (
    <td
      className={cx(
        "px-4 py-3 text-body leading-body whitespace-nowrap text-body-secondary",
        numeric && "text-right tabular-nums",
      )}
    >
      {link && href !== undefined ? (
        <a
          data-testid={linkTestId}
          href={href}
          className="rounded-lg font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {children}
        </a>
      ) : (
        children
      )}
    </td>
  );
}
