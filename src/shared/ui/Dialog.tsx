"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { X } from "lucide-react";
import { cx } from "./cx";

export type DialogSize = "sm" | "md" | "lg";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  actions?: ReactNode | undefined;
  size?: DialogSize | undefined;
  testId?: string | undefined;
}

const SIZE_STYLES: Record<DialogSize, string> = {
  sm: "max-w-[25rem]",
  md: "max-w-[30rem]",
  lg: "max-w-[35rem]",
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useOverlayDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose]);
}

export function useOverlayFocusTrap(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    restoreRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const focusables = container
      ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
          (element) => element.offsetParent !== null,
        )
      : [];
    const first = focusables[0];
    if (first) {
      first.focus();
    } else if (container) {
      container.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !container) {
        return;
      }
      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null && !element.hasAttribute("disabled"));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0] as HTMLElement;
      const lastItem = items[items.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, [open, containerRef]);
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  size = "md",
  testId,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useOverlayDismiss(open, onClose);
  useOverlayFocusTrap(open, panelRef);

  if (!open) {
    return null;
  }

  const titleId = testId ? `${testId}-title` : undefined;
  const descriptionId = description && testId ? `${testId}-description` : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          "animate-ui-dialog relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-xl border border-border bg-surface-raised shadow-lg focus-visible:outline-none",
          SIZE_STYLES[size],
        )}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 pt-4 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid={testId ? `${testId}-close` : undefined}
            className="rounded-lg p-1.5 text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {actions ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
