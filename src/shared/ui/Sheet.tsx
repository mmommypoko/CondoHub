"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useOverlayDismiss, useOverlayFocusTrap } from "./Dialog";
import { cx } from "./cx";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  testId,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useOverlayDismiss(open, onClose);
  useOverlayFocusTrap(open, panelRef);

  if (!open) {
    return null;
  }

  const titleId = testId ? `${testId}-title` : undefined;
  const descriptionId = description && testId ? `${testId}-description` : undefined;

  return (
    <div className="fixed inset-0 z-[var(--ui-z-overlay)]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="animate-ui-fade absolute inset-0 bg-overlay"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-testid={testId}
        className={cx(
          "animate-ui-sheet absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface-raised shadow-overlay focus-visible:outline-none sm:rounded-l-xl",
          className,
        )}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 pt-4 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-title leading-title font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 text-small leading-small text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            data-testid={testId ? `${testId}-close` : undefined}
            className="rounded-lg p-1.5 text-muted-foreground transition-[background-color,color] duration-fast ease-out hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
