"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { STATUS_ICONS } from "./status-icons";
import { cx } from "./cx";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  description?: string;
  durationMs?: number;
}

export interface ToastInput extends ToastOptions {
  title: string;
  variant?: ToastVariant;
}

interface ToastRecord {
  id: string;
  title: string;
  description?: string | undefined;
  variant: ToastVariant;
  durationMs: number;
}

export interface ToastFn {
  (input: ToastInput): string;
  success: (title: string, options?: ToastOptions) => string;
  error: (title: string, options?: ToastOptions) => string;
  warning: (title: string, options?: ToastOptions) => string;
  info: (title: string, options?: ToastOptions) => string;
}

interface ToastContextValue {
  toast: ToastFn;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

const TOAST_ICONS = {
  success: STATUS_ICONS.success,
  error: STATUS_ICONS.danger,
  warning: STATUS_ICONS.warning,
  info: STATUS_ICONS.info,
} as const;

const TOAST_ICON_STYLES: Record<ToastVariant, string> = {
  success: "text-success-foreground",
  error: "text-danger-foreground",
  warning: "text-warning-foreground",
  info: "text-info-foreground",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useMemo<ToastFn>(() => {
    const show = (input: ToastInput): string => {
      idRef.current += 1;
      const id = `toast-${idRef.current}`;
      const record: ToastRecord = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "info",
        durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
      };
      setToasts((current) => [...current, record]);
      return id;
    };
    const preset =
      (variant: ToastVariant) =>
      (title: string, options?: ToastOptions): string =>
        show({ ...options, title, variant });
    return Object.assign(show, {
      success: preset("success"),
      error: preset("error"),
      warning: preset("warning"),
      info: preset("info"),
    });
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }
  return (
    <div
      data-testid="toast-viewport"
      className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} record={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  record,
  onDismiss,
}: {
  record: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(record.id), record.durationMs);
    return () => window.clearTimeout(timer);
  }, [record.id, record.durationMs, onDismiss]);

  const Icon = TOAST_ICONS[record.variant];

  return (
    <div
      data-testid={`toast-${record.variant}`}
      role={record.variant === "error" ? "alert" : "status"}
      className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-lg"
    >
      <Icon aria-hidden="true" className={cx("size-5 shrink-0", TOAST_ICON_STYLES[record.variant])} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">{record.title}</p>
        {record.description ? (
          <p className="text-sm text-muted-foreground">{record.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(record.id)}
        className="rounded-lg p-1 text-muted-foreground transition-colors duration-150 hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
