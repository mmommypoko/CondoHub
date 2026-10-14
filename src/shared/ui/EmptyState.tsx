import type { HTMLAttributes, ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cx("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}
      {...rest}
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <span className="mt-1">{action}</span> : null}
    </div>
  );
}
