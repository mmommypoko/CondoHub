'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

const DAYS = [
  { key: '1', label: 'Mon' },
  { key: '2', label: 'Tue' },
  { key: '3', label: 'Wed' },
  { key: '4', label: 'Thu' },
  { key: '5', label: 'Fri' },
  { key: '6', label: 'Sat' },
  { key: '0', label: 'Sun' },
] as const;

const intString = (field: string, min: number, max: number) =>
  z
    .string()
    .refine(
      (value) => {
        const parsed = Number(value);
        return value.trim() !== '' && Number.isInteger(parsed) && parsed >= min && parsed <= max;
      },
      { message: `${field} must be an integer between ${min} and ${max}.` },
    );

const createSchema = z.object({
  code: z.string().trim().min(1, 'Code is required.').max(64),
  name: z.string().trim().min(1, 'Name is required.').max(255),
  description: z.string().trim().max(20000).optional(),
  capacity: intString('Capacity', 1, 1000),
  slotMinutes: intString('Slot length', 5, 1440),
  quotaKind: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  quotaLimit: intString('Quota limit', 0, 100000),
  advanceDays: intString('Advance days', 0, 365),
  openStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.'),
  openEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.'),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  openDays: z.array(z.string()).min(1, 'Select at least one open day.'),
});

type CreateValues = z.infer<typeof createSchema>;

interface ErrorPayload {
  error?: { message?: string };
}

function toMinutes(value: string): number {
  const [hour, minute] = value.split(':') as [string, string];
  return Number(hour) * 60 + Number(minute);
}

export function FacilityCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      capacity: '1',
      slotMinutes: '60',
      quotaKind: 'DAILY',
      quotaLimit: '2',
      advanceDays: '14',
      openStart: '09:00',
      openEnd: '18:00',
      openDays: ['1', '2', '3', '4', '5'],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (toMinutes(values.openEnd) <= toMinutes(values.openStart)) {
      setServerError('Opening end must be after opening start.');
      return;
    }
    const hasBreak =
      (values.breakStart ?? '') !== '' || (values.breakEnd ?? '') !== '';
    if (hasBreak) {
      const breakPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!breakPattern.test(values.breakStart ?? '') || !breakPattern.test(values.breakEnd ?? '')) {
        setServerError('Break times must use HH:MM format.');
        return;
      }
      const breakStart = toMinutes(values.breakStart ?? '');
      const breakEnd = toMinutes(values.breakEnd ?? '');
      if (
        breakEnd <= breakStart ||
        breakStart < toMinutes(values.openStart) ||
        breakEnd > toMinutes(values.openEnd)
      ) {
        setServerError('The break must sit inside the opening window.');
        return;
      }
    }
    const days: Record<string, { open: Array<{ start: string; end: string }>; breaks: Array<{ start: string; end: string }> }> = {};
    for (const day of ['0', '1', '2', '3', '4', '5', '6']) {
      if (!values.openDays.includes(day)) {
        days[day] = { open: [], breaks: [] };
      } else {
        days[day] = {
          open: [{ start: values.openStart, end: values.openEnd }],
          breaks: hasBreak
            ? [{ start: values.breakStart ?? '', end: values.breakEnd ?? '' }]
            : [],
        };
      }
    }
    const response = await fetch('/api/admin/facilities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        status: 'ACTIVE',
        capacity: Number(values.capacity),
        schedule: { days, holidays: [] },
        slotMinutes: Number(values.slotMinutes),
        quotaKind: values.quotaKind,
        quotaLimit: Number(values.quotaLimit),
        advanceDays: Number(values.advanceDays),
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      setServerError(payload?.error?.message ?? 'Could not create the facility.');
      return;
    }
    toast.success('Facility created.');
    router.push('/admin/facilities');
    router.refresh();
  });

  return (
    <form
      data-testid="facility-create-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {serverError !== null ? (
        <p data-testid="facility-create-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-code" className="text-sm font-medium text-foreground">
            Code
          </label>
          <input
            id="facility-create-code"
            data-testid="facility-create-code"
            type="text"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('code')}
          />
          {errors.code !== undefined ? (
            <p role="alert" className="text-sm text-danger">
              {errors.code.message}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="facility-create-name"
            data-testid="facility-create-name"
            type="text"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('name')}
          />
          {errors.name !== undefined ? (
            <p role="alert" className="text-sm text-danger">
              {errors.name.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="facility-create-description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="facility-create-description"
          data-testid="facility-create-description"
          rows={3}
          className="w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground"
          {...register('description')}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-capacity" className="text-sm font-medium text-foreground">
            Seats per slot
          </label>
          <input
            id="facility-create-capacity"
            data-testid="facility-create-capacity"
            type="number"
            min={1}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('capacity')}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-slot" className="text-sm font-medium text-foreground">
            Slot length (minutes)
          </label>
          <input
            id="facility-create-slot"
            data-testid="facility-create-slot-minutes"
            type="number"
            min={5}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('slotMinutes')}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-quota-kind" className="text-sm font-medium text-foreground">
            Quota period
          </label>
          <select
            id="facility-create-quota-kind"
            data-testid="facility-create-quota-kind"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('quotaKind')}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-quota-limit" className="text-sm font-medium text-foreground">
            Quota slots per period
          </label>
          <input
            id="facility-create-quota-limit"
            data-testid="facility-create-quota-limit"
            type="number"
            min={0}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('quotaLimit')}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-advance" className="text-sm font-medium text-foreground">
            Advance booking days
          </label>
          <input
            id="facility-create-advance"
            data-testid="facility-create-advance-days"
            type="number"
            min={0}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('advanceDays')}
          />
        </div>
      </div>
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Open days</legend>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day) => (
            <label key={day.key} className="flex items-center gap-2 text-sm text-foreground">
              <input
                data-testid={`facility-create-day-${day.key}`}
                type="checkbox"
                value={day.key}
                {...register('openDays')}
              />
              {day.label}
            </label>
          ))}
        </div>
        {errors.openDays !== undefined ? (
          <p role="alert" className="text-sm text-danger">
            {errors.openDays.message}
          </p>
        ) : null}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-open-start" className="text-sm font-medium text-foreground">
            Opens
          </label>
          <input
            id="facility-create-open-start"
            data-testid="facility-create-open-start"
            type="time"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('openStart')}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-open-end" className="text-sm font-medium text-foreground">
            Closes
          </label>
          <input
            id="facility-create-open-end"
            data-testid="facility-create-open-end"
            type="time"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('openEnd')}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-break-start" className="text-sm font-medium text-foreground">
            Break start (optional)
          </label>
          <input
            id="facility-create-break-start"
            data-testid="facility-create-break-start"
            type="time"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('breakStart')}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-create-break-end" className="text-sm font-medium text-foreground">
            Break end (optional)
          </label>
          <input
            id="facility-create-break-end"
            data-testid="facility-create-break-end"
            type="time"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('breakEnd')}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="facility-create-submit" type="submit" loading={isSubmitting}>
          Create facility
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/admin/facilities')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
