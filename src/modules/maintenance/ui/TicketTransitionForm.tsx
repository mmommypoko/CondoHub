'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import {
  ticketTransitionFormSchema,
  type TicketTransitionFormValues,
} from '@/modules/maintenance/ui/maintenanceFormSchemas';
import { isTerminalTicketStatus, statusLabel } from '@/modules/maintenance/ui/ticketLabels';

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

function transitionErrorCopy(code: string | undefined, fallback: string): string {
  if (code === 'RESOURCE_NOT_FOUND' || code === 'ACCESS_DENIED') {
    return 'This request is not available.';
  }
  if (code === 'VERSION_CONFLICT') {
    return 'Someone changed this request first. Reload the page and retry.';
  }
  if (code === 'RATE_LIMITED') return 'Too many requests. Please wait a moment and retry.';
  return fallback;
}

const HANDLER_OPTIONS: Record<string, readonly string[]> = {
  PENDING: ['IN_PROGRESS', 'WAITING_FOR_INFO', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_INFO', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  WAITING_FOR_INFO: ['IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'],
};

export type TicketTransitionAction =
  | 'handler'
  | 'reporter-cancel';

export function TicketTransitionForm({
  ticketId,
  currentStatus,
  expectedVersion,
  mode,
  testIdPrefix,
  onTransitioned,
}: {
  ticketId: string;
  currentStatus: string;
  expectedVersion: number;
  mode: TicketTransitionAction;
  testIdPrefix: string;
  onTransitioned: () => void;
}) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const options =
    mode === 'reporter-cancel'
      ? (['CANCELLED'] as const)
      : ((HANDLER_OPTIONS[currentStatus] ?? []) as readonly string[]);
  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TicketTransitionFormValues>({
    resolver: zodResolver(ticketTransitionFormSchema),
    defaultValues: {
      status: (mode === 'reporter-cancel' ? 'CANCELLED' : (options[0] ?? 'IN_PROGRESS')) as
        | 'PENDING'
        | 'IN_PROGRESS'
        | 'WAITING_FOR_INFO'
        | 'COMPLETED'
        | 'REJECTED'
        | 'CANCELLED',
      reason: '',
    },
  });
  const status = watch('status');
  const terminal = isTerminalTicketStatus(currentStatus);

  if (terminal) return null;
  if (mode === 'handler' && options.length === 0) return null;

  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      const response = await fetch(`/api/maintenance/${ticketId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: values.status,
          expectedVersion,
          ...(values.status === 'REJECTED' && values.reason !== undefined && values.reason !== ''
            ? { reason: values.reason.trim() }
            : {}),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setServerError(
          transitionErrorCopy(payload?.error?.code, payload?.error?.message ?? 'Could not update the request.'),
        );
        return;
      }
      toast.success('Request updated.');
      onTransitioned();
    },
    (invalid) => {
      if (invalid.status !== undefined) {
        setFocus('status');
        return;
      }
      setFocus('reason');
    },
  );

  return (
    <form data-testid={`${testIdPrefix}-transition-form`} onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-3">
      {serverError !== null ? (
        <p data-testid={`${testIdPrefix}-transition-error`} role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      {mode === 'handler' ? (
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${testIdPrefix}-transition-status`} className="text-sm font-medium text-foreground">
            New status
          </label>
          <select
            id={`${testIdPrefix}-transition-status`}
            data-testid={`${testIdPrefix}-transition-status`}
            aria-invalid={errors.status !== undefined}
            aria-describedby={errors.status !== undefined ? `${testIdPrefix}-transition-status-error` : undefined}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('status')}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {statusLabel(option)}
              </option>
            ))}
          </select>
          {errors.status !== undefined ? (
            <p id={`${testIdPrefix}-transition-status-error`} data-testid={`${testIdPrefix}-transition-status-error`} role="alert" className="text-sm text-danger">
              {errors.status.message}
            </p>
          ) : null}
        </div>
      ) : (
        <input type="hidden" data-testid={`${testIdPrefix}-transition-status`} {...register('status')} />
      )}
      {mode === 'handler' && status === 'REJECTED' ? (
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${testIdPrefix}-transition-reason`} className="text-sm font-medium text-foreground">
            Rejection reason
          </label>
          <input
            id={`${testIdPrefix}-transition-reason`}
            data-testid={`${testIdPrefix}-transition-reason`}
            type="text"
            maxLength={2000}
            placeholder="Explain why this request cannot proceed."
            aria-invalid={errors.reason !== undefined}
            aria-describedby={errors.reason !== undefined ? `${testIdPrefix}-transition-reason-error` : undefined}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('reason')}
          />
          {errors.reason !== undefined ? (
            <p id={`${testIdPrefix}-transition-reason-error`} data-testid={`${testIdPrefix}-transition-reason-error`} role="alert" className="text-sm text-danger">
              {errors.reason.message}
            </p>
          ) : null}
        </div>
      ) : null}
      <div>
        <Button
          data-testid={`${testIdPrefix}-transition-submit`}
          type="submit"
          variant={status === 'REJECTED' || status === 'CANCELLED' ? 'destructive' : 'primary'}
          loading={isSubmitting}
          size="sm"
        >
          {mode === 'reporter-cancel' ? 'Cancel request' : 'Update status'}
        </Button>
      </div>
    </form>
  );
}
