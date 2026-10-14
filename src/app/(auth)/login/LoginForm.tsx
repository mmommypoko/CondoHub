'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { authClient } from '@/modules/identity-access/ui/authClient';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginValues = z.infer<typeof loginSchema>;

function safeReturnUrl(value: string | null): string {
  if (value === null || value === '') return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await authClient.signIn.username({
      username: values.username,
      password: values.password,
    });
    if (result.error !== null) {
      setServerError('Invalid username or password.');
      return;
    }
    const session = await authClient.getSession();
    const user = session.data?.user as { mustChangePassword?: unknown } | undefined;
    if (user?.mustChangePassword === true) {
      router.push('/change-password');
      return;
    }
    router.push(safeReturnUrl(searchParams.get('returnUrl')));
    router.refresh();
  });

  return (
    <form data-testid="login-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
      {serverError !== null ? (
        <p data-testid="login-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="login-username" className="text-sm font-medium text-foreground">
          Username
        </label>
        <input
          id="login-username"
          data-testid="login-username"
          type="text"
          autoComplete="username"
          aria-invalid={errors.username !== undefined}
          aria-describedby={errors.username !== undefined ? 'login-username-error' : undefined}
          className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('username')}
        />
        {errors.username !== undefined ? (
          <p id="login-username-error" role="alert" className="text-sm text-danger">
            {errors.username.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="login-password"
          data-testid="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password !== undefined ? 'login-password-error' : undefined}
          className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('password')}
        />
        {errors.password !== undefined ? (
          <p id="login-password-error" role="alert" className="text-sm text-danger">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <Button data-testid="login-submit" type="submit" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
