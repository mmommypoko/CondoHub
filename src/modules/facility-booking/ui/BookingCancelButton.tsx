'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

const cancelSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required.').max(2000),
  refundQuota: z.boolean().optional(),
});

type CancelValues = z.infer<typeof cancelSchema>;

interface ErrorPayload {
  error?: { message?: string };
}

export function BookingCancelButton({
  bookingId,
  slotId,
  startsAt,
  testId,
  admin,
}: {
  bookingId: string;
  slotId: string;
  startsAt: string;
  testId: string;
  admin?: boolean | undefined;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CancelValues>({ resolver: zodResolver(cancelSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/bookings/${bookingId}/slots/${slotId}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reason: values.reason,
        ...(admin === true ? { refundQuota: values.refundQuota ?? false } : {}),
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      setServerError(payload?.error?.message ?? 'Could not cancel the slot.');
      return;
    }
    toast.success('Slot cancelled.');
    setOpen(false);
    reset();
    router.refresh();
  });

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        data-testid={`${testId}-open`}
        onClick={() => setOpen(true)}
      >
        Cancel
      </Button>
    );
  }

  return (
    <form
      data-testid={testId}
      onSubmit={onSubmit}
      noValidate
      className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
    >
      <p className="text-xs text-muted-foreground">
        Cancelling {new Date(startsAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}
        {admin === true
          ? ' as admin. Choose whether the room quota is refunded.'
          : '. Resident cancellations release the seat but keep the quota used.'}
      </p>
      {serverError !== null ? (
        <p data-testid={`${testId}-error`} role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <label htmlFor={`${testId}-reason`} className="text-sm font-medium text-foreground">
        Reason
      </label>
      <input
        id={`${testId}-reason`}
        data-testid={`${testId}-reason`}
        type="text"
        aria-invalid={errors.reason !== undefined}
        className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
        {...register('reason')}
      />
      {errors.reason !== undefined ? (
        <p role="alert" className="text-sm text-danger">
          {errors.reason.message}
        </p>
      ) : null}
      {admin === true ? (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input data-testid={`${testId}-refund`} type="checkbox" {...register('refundQuota')} />
          Refund quota for this slot
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button data-testid={`${testId}-submit`} type="submit" size="sm" loading={isSubmitting}>
          Confirm cancel
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Keep slot
        </Button>
      </div>
    </form>
  );
}
