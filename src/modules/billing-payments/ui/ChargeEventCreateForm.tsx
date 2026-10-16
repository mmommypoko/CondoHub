'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import {
  chargeEventCreateSchema,
  type ChargeEventCreateValues,
} from '@/modules/billing-payments/ui/chargeEventFormSchema';

const FIELD_ORDER: Array<keyof ChargeEventCreateValues> = [
  'eventEffectiveDate',
  'configuredAmount',
  'contextNote',
];

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

interface CreatedPayload {
  data?: { id?: string };
}

export function ChargeEventCreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ChargeEventCreateValues>({
    resolver: zodResolver(chargeEventCreateSchema),
    defaultValues: { eventEffectiveDate: '', configuredAmount: '', contextNote: '' },
  });

  const onInvalid = (fieldErrors: typeof errors) => {
    const first = FIELD_ORDER.find((name) => fieldErrors[name] !== undefined);
    if (first !== undefined) setFocus(first);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      setConflict(false);
      const amount = values.configuredAmount?.trim() ?? '';
      const note = values.contextNote?.trim() ?? '';
      const response = await fetch('/api/admin/billing/common-fee-events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventEffectiveDate: values.eventEffectiveDate,
          status: 'OPEN',
          ...(amount === ''
            ? {}
            : { configuredAmount: { amount, currency: 'THB' } }),
          ...(note === '' ? {} : { chargeContext: { note } }),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        if (response.status === 401 || response.status === 403) {
          setServerError('Your session cannot create billing events. Sign in as a system admin.');
          return;
        }
        if (response.status === 409) setConflict(true);
        setServerError(payload?.error?.message ?? 'Could not create the billing event.');
        return;
      }
      const payload = (await response.json().catch(() => null)) as CreatedPayload | null;
      const createdId = payload?.data?.id;
      if (typeof createdId !== 'string' || createdId === '') {
        setServerError('The event was created but the response was empty. Reload the list.');
        return;
      }
      toast.success('Billing event created.');
      router.push(`/admin/billing/events/${createdId}`);
      router.refresh();
    },
    onInvalid,
  );

  return (
    <form data-testid="charge-event-create-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {serverError !== null ? (
        <p data-testid="charge-event-create-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      {conflict ? (
        <p data-testid="charge-event-create-conflict" role="alert" className="text-sm text-danger">
          The event conflicts with an existing record.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="charge-event-create-date" className="text-sm font-medium text-foreground">
            Effective date
          </label>
          <input
            id="charge-event-create-date"
            data-testid="charge-event-create-date"
            type="date"
            aria-invalid={errors.eventEffectiveDate !== undefined}
            aria-describedby={
              errors.eventEffectiveDate !== undefined ? 'charge-event-create-date-error' : undefined
            }
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('eventEffectiveDate')}
          />
          {errors.eventEffectiveDate !== undefined ? (
            <p id="charge-event-create-date-error" role="alert" className="text-sm text-danger">
              {errors.eventEffectiveDate.message}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="charge-event-create-amount" className="text-sm font-medium text-foreground">
            Amount (THB, optional)
          </label>
          <input
            id="charge-event-create-amount"
            data-testid="charge-event-create-amount"
            type="text"
            inputMode="decimal"
            placeholder="3000.00"
            aria-invalid={errors.configuredAmount !== undefined}
            aria-describedby={
              errors.configuredAmount !== undefined ? 'charge-event-create-amount-error' : undefined
            }
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('configuredAmount')}
          />
          {errors.configuredAmount !== undefined ? (
            <p id="charge-event-create-amount-error" role="alert" className="text-sm text-danger">
              {errors.configuredAmount.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="charge-event-create-note" className="text-sm font-medium text-foreground">
          Note (optional)
        </label>
        <input
          id="charge-event-create-note"
          data-testid="charge-event-create-note"
          type="text"
          maxLength={500}
          aria-invalid={errors.contextNote !== undefined}
          aria-describedby={
            errors.contextNote !== undefined ? 'charge-event-create-note-error' : undefined
          }
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('contextNote')}
        />
        {errors.contextNote !== undefined ? (
          <p id="charge-event-create-note-error" role="alert" className="text-sm text-danger">
            {errors.contextNote.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="charge-event-create-submit" type="submit" loading={isSubmitting}>
          Create event
        </Button>
        <Button
          data-testid="charge-event-create-cancel"
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/billing/events')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
