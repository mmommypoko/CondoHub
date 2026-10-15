'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Badge } from '@/shared/ui/Badge';
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

const configSchema = z.object({
  slotMinutes: intString('Slot length', 5, 1440),
  quotaKind: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  quotaLimit: intString('Quota limit', 0, 100000),
  advanceDays: intString('Advance days', 0, 365),
  effectiveAt: z.string().min(1, 'Effective time is required.'),
  openStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.'),
  openEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.'),
  openDays: z.array(z.string()).min(1, 'Select at least one open day.'),
});

type ConfigValues = z.infer<typeof configSchema>;

interface PreviewPayload {
  data: {
    facilityId: string;
    configVersion: number;
    effectiveAt: string;
    quotaOnlyReduction: boolean;
    structuralConflicts: Array<{
      id: string;
      bookingId: string;
      roomId: string;
      startsAt: string;
      endsAt: string;
      conflicts: string[];
    }>;
    quotaImpacts: Array<{ roomId: string; periodKey: string; used: number; newLimit: number; overBy: number }>;
    previewToken: string;
  };
}

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

function toMinutes(value: string): number {
  const [hour, minute] = value.split(':') as [string, string];
  return Number(hour) * 60 + Number(minute);
}

export function ConfigChangeForm({
  facilityId,
  capacity,
  initial,
}: {
  facilityId: string;
  capacity: number;
  initial: {
    slotMinutes: number;
    quotaKind: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    quotaLimit: number;
    advanceDays: number;
    openStart: string;
    openEnd: string;
    openDays: string[];
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload['data'] | null>(null);
  const [working, setWorking] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      slotMinutes: String(initial.slotMinutes),
      quotaKind: initial.quotaKind,
      quotaLimit: String(initial.quotaLimit),
      advanceDays: String(initial.advanceDays),
      effectiveAt: '',
      openStart: initial.openStart,
      openEnd: initial.openEnd,
      openDays: initial.openDays,
    },
  });

  const buildBody = (values: ConfigValues): Record<string, unknown> | null => {
    if (toMinutes(values.openEnd) <= toMinutes(values.openStart)) {
      setServerError('Opening end must be after opening start.');
      return null;
    }
    const effectiveAt = new Date(values.effectiveAt);
    if (Number.isNaN(effectiveAt.getTime())) {
      setServerError('The effective time is invalid.');
      return null;
    }
    const days: Record<string, { open: Array<{ start: string; end: string }>; breaks: Array<{ start: string; end: string }> }> = {};
    for (const day of ['0', '1', '2', '3', '4', '5', '6']) {
      days[day] = values.openDays.includes(day)
        ? { open: [{ start: values.openStart, end: values.openEnd }], breaks: [] }
        : { open: [], breaks: [] };
    }
    return {
      schedule: { days, holidays: [] },
      slotMinutes: Number(values.slotMinutes),
      capacity,
      quotaKind: values.quotaKind,
      quotaLimit: Number(values.quotaLimit),
      advanceDays: Number(values.advanceDays),
      effectiveAt: effectiveAt.toISOString(),
    };
  };

  const onPreview = handleSubmit(async (values) => {
    setServerError(null);
    setPreview(null);
    const body = buildBody(values);
    if (body === null) return;
    setWorking(true);
    try {
      const response = await fetch(`/api/admin/facilities/${facilityId}/config-preview`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setServerError(payload?.error?.message ?? 'Could not preview the config change.');
        return;
      }
      const parsed = (await response.json()) as PreviewPayload;
      setPreview(parsed.data);
    } catch {
      setServerError('Could not preview the config change.');
    } finally {
      setWorking(false);
    }
  });

  const onCommit = async () => {
    if (preview === null) return;
    setServerError(null);
    const values = getValues();
    const body = buildBody(values);
    if (body === null) return;
    setWorking(true);
    try {
      const key =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-config`;
      const response = await fetch(`/api/admin/facilities/${facilityId}/config-commit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ ...body, previewToken: preview.previewToken }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        if (payload?.error?.code === 'CONFIG_IMPACT_CHANGED') {
          setPreview(null);
        }
        setServerError(payload?.error?.message ?? 'Could not commit the config change.');
        return;
      }
      toast.success('Config committed.');
      setPreview(null);
      router.refresh();
    } catch {
      setServerError('Could not commit the config change.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="config-change">
      <form data-testid="config-change-form" onSubmit={onPreview} noValidate className="flex flex-col gap-4">
        {serverError !== null ? (
          <p data-testid="config-change-error" role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="config-change-slot" className="text-sm font-medium text-foreground">
              Slot length (minutes)
            </label>
            <input
              id="config-change-slot"
              data-testid="config-change-slot-minutes"
              type="number"
              min={5}
              className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
              {...register('slotMinutes')}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="config-change-kind" className="text-sm font-medium text-foreground">
              Quota period
            </label>
            <select
              id="config-change-kind"
              data-testid="config-change-quota-kind"
              className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
              {...register('quotaKind')}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="config-change-limit" className="text-sm font-medium text-foreground">
              Quota slots per period
            </label>
            <input
              id="config-change-limit"
              data-testid="config-change-quota-limit"
              type="number"
              min={0}
              className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
              {...register('quotaLimit')}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="config-change-advance" className="text-sm font-medium text-foreground">
              Advance booking days
            </label>
            <input
              id="config-change-advance"
              data-testid="config-change-advance-days"
              type="number"
              min={0}
              className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
              {...register('advanceDays')}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
            <label htmlFor="config-change-effective" className="text-sm font-medium text-foreground">
              Effective at
            </label>
            <input
              id="config-change-effective"
              data-testid="config-change-effective-at"
              type="datetime-local"
              className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
              {...register('effectiveAt')}
            />
            {errors.effectiveAt !== undefined ? (
              <p role="alert" className="text-sm text-danger">
                {errors.effectiveAt.message}
              </p>
            ) : null}
          </div>
        </div>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">Open days</legend>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <label key={day.key} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  data-testid={`config-change-day-${day.key}`}
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
            <label htmlFor="config-change-open-start" className="text-sm font-medium text-foreground">
              Opens
            </label>
            <input
              id="config-change-open-start"
              data-testid="config-change-open-start"
              type="time"
              className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
              {...register('openStart')}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="config-change-open-end" className="text-sm font-medium text-foreground">
              Closes
            </label>
            <input
              id="config-change-open-end"
              data-testid="config-change-open-end"
              type="time"
              className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
              {...register('openEnd')}
            />
          </div>
        </div>
        <div>
          <Button data-testid="config-change-preview" type="submit" variant="secondary" loading={working}>
            Preview impact
          </Button>
        </div>
      </form>
      {preview !== null ? (
        <section
          data-testid="config-change-preview-result"
          aria-label="Config impact preview"
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={preview.quotaOnlyReduction ? 'info' : 'neutral'}>
              {preview.quotaOnlyReduction ? 'Quota-only reduction' : 'Structural change'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Based on config version {preview.configVersion}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-foreground">
              {preview.structuralConflicts.length} conflicting future slot
              {preview.structuralConflicts.length === 1 ? '' : 's'}
            </p>
            {preview.structuralConflicts.length === 0 ? (
              <p data-testid="config-change-no-conflicts" className="text-sm text-muted-foreground">
                No future bookings conflict with the proposed schedule, length, capacity, or closures.
              </p>
            ) : (
              <ul data-testid="config-change-conflicts" className="flex flex-col gap-1">
                {preview.structuralConflicts.slice(0, 20).map((slot) => (
                  <li key={slot.id} className="break-words text-sm text-foreground">
                    {new Date(slot.startsAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}
                    {' · '}
                    {slot.conflicts.join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-foreground">
              {preview.quotaImpacts.length} room-period{preview.quotaImpacts.length === 1 ? '' : 's'} over the new limit
            </p>
            {preview.quotaImpacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No room currently exceeds the proposed quota limit.
              </p>
            ) : (
              <ul data-testid="config-change-quota-impacts" className="flex flex-col gap-1">
                {preview.quotaImpacts.slice(0, 20).map((impact) => (
                  <li key={`${impact.roomId}-${impact.periodKey}`} className="break-words text-sm text-foreground">
                    {impact.periodKey}: used {impact.used}, new limit {impact.newLimit}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Quota-only reductions never cancel existing bookings; new requests are blocked until usage fits.
            </p>
          </div>
          <div>
            <Button
              data-testid="config-change-commit"
              type="button"
              loading={working}
              disabled={preview.structuralConflicts.length > 0}
              onClick={() => void onCommit()}
            >
              Commit config
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
