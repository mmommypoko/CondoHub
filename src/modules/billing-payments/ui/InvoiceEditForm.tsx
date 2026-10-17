'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import {
  invoiceEditFormSchema,
  type InvoiceEditFormValues,
} from '@/modules/billing-payments/ui/paymentFormSchemas';

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

export function InvoiceEditForm({
  invoiceId,
  version,
  currentTotal,
  onEdited,
}: {
  invoiceId: string;
  version: number;
  currentTotal: string;
  onEdited: () => void;
}) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceEditFormValues>({
    resolver: zodResolver(invoiceEditFormSchema),
    defaultValues: { total: currentTotal, reason: '', expectedVersion: version },
  });
  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      setConflict(false);
      const trimmedReason = values.reason?.trim() ?? '';
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          total: { amount: values.total.trim(), currency: 'THB' },
          expectedVersion: version,
          ...(trimmedReason === '' ? {} : { reason: trimmedReason }),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        const code = payload?.error?.code;
        if (code === 'VERSION_CONFLICT') {
          setConflict(true);
          return;
        }
        if (code === 'RESOURCE_NOT_FOUND' || code === 'ACCESS_DENIED') {
          setServerError('This edit is not available.');
          return;
        }
        setServerError(payload?.error?.message ?? 'Could not update the invoice total.');
        return;
      }
      toast.success('Invoice total updated.');
      onEdited();
    },
    (invalid) => {
      if (invalid.total !== undefined) setFocus('total');
      else if (invalid.reason !== undefined) setFocus('reason');
    },
  );
  return (
    <form data-testid="invoice-edit-form" onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-3">
      {serverError !== null ? (
        <p data-testid="invoice-edit-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      {conflict ? (
        <p data-testid="invoice-edit-conflict" role="alert" className="text-sm text-danger">
          Someone changed this invoice first. Reload the page to see the latest total.
        </p>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="invoice-edit-total" className="text-sm font-medium text-foreground">
          New total (THB)
        </label>
        <input
          id="invoice-edit-total"
          data-testid="invoice-edit-total"
          type="text"
          inputMode="decimal"
          placeholder="3000.00"
          aria-invalid={errors.total !== undefined}
          aria-describedby={errors.total !== undefined ? 'invoice-edit-total-error' : undefined}
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('total')}
        />
        {errors.total !== undefined ? (
          <p id="invoice-edit-total-error" data-testid="invoice-edit-total-error" role="alert" className="text-sm text-danger">
            {errors.total.message}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="invoice-edit-reason" className="text-sm font-medium text-foreground">
          Reason (optional)
        </label>
        <input
          id="invoice-edit-reason"
          data-testid="invoice-edit-reason"
          type="text"
          maxLength={2000}
          aria-invalid={errors.reason !== undefined}
          aria-describedby={errors.reason !== undefined ? 'invoice-edit-reason-error' : undefined}
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('reason')}
        />
        {errors.reason !== undefined ? (
          <p id="invoice-edit-reason-error" data-testid="invoice-edit-reason-error" role="alert" className="text-sm text-danger">
            {errors.reason.message}
          </p>
        ) : null}
      </div>
      <div>
        <Button data-testid="invoice-edit-submit" type="submit" loading={isSubmitting} size="sm">
          Update total
        </Button>
      </div>
    </form>
  );
}
