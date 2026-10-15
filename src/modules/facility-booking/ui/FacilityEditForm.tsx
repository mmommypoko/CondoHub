'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

const editSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(255),
  description: z.string().trim().max(20000).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  capacity: z
    .string()
    .refine(
      (value) => {
        const parsed = Number(value);
        return value.trim() !== '' && Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000;
      },
      { message: 'Capacity must be an integer between 1 and 1000.' },
    ),
});

type EditValues = z.infer<typeof editSchema>;

interface ErrorPayload {
  error?: { message?: string };
}

export function FacilityEditForm({
  facilityId,
  initial,
}: {
  facilityId: string;
  initial: { name: string; description: string | null; status: 'ACTIVE' | 'INACTIVE'; capacity: number };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: initial.name,
      description: initial.description ?? '',
      status: initial.status,
      capacity: String(initial.capacity),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/admin/facilities/${facilityId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        description: values.description === '' ? null : (values.description ?? null),
        status: values.status,
        capacity: Number(values.capacity),
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      setServerError(payload?.error?.message ?? 'Could not save the facility.');
      return;
    }
    toast.success('Facility saved.');
    router.refresh();
  });

  return (
    <form
      data-testid="facility-edit-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {serverError !== null ? (
        <p data-testid="facility-edit-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-edit-name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="facility-edit-name"
            data-testid="facility-edit-name"
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
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="facility-edit-capacity" className="text-sm font-medium text-foreground">
            Seats per slot
          </label>
          <input
            id="facility-edit-capacity"
            data-testid="facility-edit-capacity"
            type="number"
            min={1}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            {...register('capacity')}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="facility-edit-description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="facility-edit-description"
          data-testid="facility-edit-description"
          rows={3}
          className="w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground"
          {...register('description')}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="facility-edit-status" className="text-sm font-medium text-foreground">
          Status
        </label>
        <select
          id="facility-edit-status"
          data-testid="facility-edit-status"
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
          {...register('status')}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      <div>
        <Button data-testid="facility-edit-submit" type="submit" loading={isSubmitting}>
          Save facility
        </Button>
      </div>
    </form>
  );
}
