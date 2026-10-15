'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

const closureSchema = z.object({
  startsAt: z.string().min(1, 'Start is required.'),
  endsAt: z.string().min(1, 'End is required.'),
  reason: z.string().trim().min(1, 'A reason is required.').max(2000),
});

type ClosureValues = z.infer<typeof closureSchema>;

interface ErrorPayload {
  error?: { message?: string };
}

export function ClosureCreateForm({ facilityId }: { facilityId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClosureValues>({ resolver: zodResolver(closureSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const startsAt = new Date(values.startsAt);
    const endsAt = new Date(values.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setServerError('The closure times are invalid.');
      return;
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      setServerError('The closure end must be after its start.');
      return;
    }
    const response = await fetch(`/api/admin/facilities/${facilityId}/closures`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: values.reason,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      setServerError(payload?.error?.message ?? 'Could not add the closure.');
      return;
    }
    toast.success('Closure added.');
    reset();
    router.refresh();
  });

  return (
    <form
      data-testid="closure-create-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-3"
    >
      {serverError !== null ? (
        <p data-testid="closure-create-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="closure-create-start" className="text-sm font-medium text-foreground">
            Starts at
          </label>
          <input
            id="closure-create-start"
            data-testid="closure-create-start"
            type="datetime-local"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('startsAt')}
          />
          {errors.startsAt !== undefined ? (
            <p role="alert" className="text-sm text-danger">
              {errors.startsAt.message}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="closure-create-end" className="text-sm font-medium text-foreground">
            Ends at
          </label>
          <input
            id="closure-create-end"
            data-testid="closure-create-end"
            type="datetime-local"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('endsAt')}
          />
          {errors.endsAt !== undefined ? (
            <p role="alert" className="text-sm text-danger">
              {errors.endsAt.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="closure-create-reason" className="text-sm font-medium text-foreground">
          Reason
        </label>
        <input
          id="closure-create-reason"
          data-testid="closure-create-reason"
          type="text"
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
          {...register('reason')}
        />
        {errors.reason !== undefined ? (
          <p role="alert" className="text-sm text-danger">
            {errors.reason.message}
          </p>
        ) : null}
      </div>
      <div>
        <Button data-testid="closure-create-submit" type="submit" loading={isSubmitting}>
          Add closure
        </Button>
      </div>
    </form>
  );
}
