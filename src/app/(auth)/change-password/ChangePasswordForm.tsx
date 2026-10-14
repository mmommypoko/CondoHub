'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { authClient } from '@/modules/identity-access/ui/authClient';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(12, 'New password must be at least 12 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm the new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
      } | null;
      const fieldMessage = payload?.error?.fieldErrors?.newPassword?.[0];
      setServerError(fieldMessage ?? payload?.error?.message ?? 'Password change failed.');
      return;
    }
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  });

  return (
    <form data-testid="change-password-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Change password</h2>
      <p className="text-sm text-muted-foreground">
        Your password must be at least 12 characters and differ from your username and temporary password.
      </p>
      {serverError !== null ? (
        <p data-testid="change-password-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="change-current" className="text-sm font-medium text-foreground">
          Current password
        </label>
        <input
          id="change-current"
          data-testid="change-password-current"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.currentPassword !== undefined}
          aria-describedby={errors.currentPassword !== undefined ? 'change-current-error' : undefined}
          className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('currentPassword')}
        />
        {errors.currentPassword !== undefined ? (
          <p id="change-current-error" role="alert" className="text-sm text-danger">
            {errors.currentPassword.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="change-new" className="text-sm font-medium text-foreground">
          New password
        </label>
        <input
          id="change-new"
          data-testid="change-password-new"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.newPassword !== undefined}
          aria-describedby={errors.newPassword !== undefined ? 'change-new-error' : undefined}
          className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('newPassword')}
        />
        {errors.newPassword !== undefined ? (
          <p id="change-new-error" role="alert" className="text-sm text-danger">
            {errors.newPassword.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="change-confirm" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <input
          id="change-confirm"
          data-testid="change-password-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword !== undefined}
          aria-describedby={errors.confirmPassword !== undefined ? 'change-confirm-error' : undefined}
          className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword !== undefined ? (
          <p id="change-confirm-error" role="alert" className="text-sm text-danger">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>
      <Button data-testid="change-password-submit" type="submit" loading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}
