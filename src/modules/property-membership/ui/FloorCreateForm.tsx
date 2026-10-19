'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button, FormField, INPUT_CLASS, serverErrorMessage, useToast } from '@/shared/ui';

const createSchema = z.object({
  code: z.string().trim().min(1, 'Code is required.').max(64),
  label: z.string().trim().min(1, 'Label is required.').max(255),
});

type CreateValues = z.infer<typeof createSchema>;

export function FloorCreateForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { code: '', label: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch('/api/admin/floors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        buildingId,
        code: values.code,
        label: values.label,
      }),
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      setServerError(serverErrorMessage(payload, 'Could not create the floor.'));
      return;
    }
    toast.success('Floor created.');
    reset();
    router.refresh();
  });

  return (
    <form
      data-testid="floor-create-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      {serverError !== null ? (
        <p
          data-testid="floor-create-error"
          role="alert"
          className="text-body leading-body font-medium text-danger-foreground"
        >
          {serverError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Code" htmlFor="floor-create-code" error={errors.code?.message ?? ''} required>
          <input
            data-testid="floor-create-code"
            type="text"
            required
            className={INPUT_CLASS}
            {...register('code')}
          />
        </FormField>
        <FormField label="Label" htmlFor="floor-create-label" error={errors.label?.message ?? ''} required>
          <input
            data-testid="floor-create-label"
            type="text"
            required
            className={INPUT_CLASS}
            {...register('label')}
          />
        </FormField>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="floor-create-submit" type="submit" loading={isSubmitting}>
          Create floor
        </Button>
      </div>
    </form>
  );
}
