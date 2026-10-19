'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button, FormField, INPUT_CLASS, serverErrorMessage, useToast } from '@/shared/ui';

const createSchema = z.object({
  code: z.string().trim().min(1, 'Code is required.').max(64),
  name: z.string().trim().min(1, 'Name is required.').max(255),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type CreateValues = z.infer<typeof createSchema>;

export function BuildingCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { code: '', name: '', status: 'ACTIVE' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch('/api/admin/buildings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId,
        code: values.code,
        name: values.name,
        status: values.status,
      }),
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      setServerError(serverErrorMessage(payload, 'Could not create the building.'));
      return;
    }
    toast.success('Building created.');
    router.push('/admin/buildings');
    router.refresh();
  });

  return (
    <form
      data-testid="building-create-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      {serverError !== null ? (
        <p
          data-testid="building-create-error"
          role="alert"
          className="text-sm font-medium text-danger-foreground"
        >
          {serverError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Code" htmlFor="building-create-code" error={errors.code?.message ?? ''} required>
          <input
            data-testid="building-create-code"
            type="text"
            required
            className={INPUT_CLASS}
            {...register('code')}
          />
        </FormField>
        <FormField label="Name" htmlFor="building-create-name" error={errors.name?.message ?? ''} required>
          <input
            data-testid="building-create-name"
            type="text"
            required
            className={INPUT_CLASS}
            {...register('name')}
          />
        </FormField>
      </div>
      <FormField label="Status" htmlFor="building-create-status">
        <select
          data-testid="building-create-status"
          className={INPUT_CLASS}
          {...register('status')}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="building-create-submit" type="submit" loading={isSubmitting}>
          Create building
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/admin/buildings')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
