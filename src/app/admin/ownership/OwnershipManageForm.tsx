'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button, FormField, INPUT_CLASS, serverErrorMessage, useToast } from '@/shared/ui';

const usernameRule = z
  .string()
  .trim()
  .min(1, 'Username is required.')
  .max(30)
  .regex(/^[a-z0-9._]+$/, 'Use lowercase letters, digits, dots, and underscores.');

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

const transferSchema = z.object({
  fromOwnershipId: z.string().min(1, 'Owner is required.'),
  toUsername: usernameRule,
  effectiveDate: dateString,
});

const removeSchema = z.object({
  ownershipId: z.string().min(1, 'Owner is required.'),
  effectiveDate: dateString,
});

type TransferValues = z.infer<typeof transferSchema>;
type RemoveValues = z.infer<typeof removeSchema>;

export interface OwnerOption {
  ownershipId: string;
  userId: string;
  name: string;
}

function toEffectiveAt(date: string): string {
  return `${date}T00:00:00+07:00`;
}

export function OwnershipManageForm({
  roomId,
  owners,
}: {
  roomId: string;
  owners: OwnerOption[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TransferForm roomId={roomId} owners={owners} />
      <RemoveForm roomId={roomId} owners={owners} />
    </div>
  );
}

const assignSchema = z.object({
  username: usernameRule,
  effectiveDate: z.union([dateString, z.literal('')]).optional(),
});

type AssignValues = z.infer<typeof assignSchema>;

export function OwnershipAssignForm({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { username: '', effectiveDate: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/admin/rooms/${roomId}/owners`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: values.username,
        ...(values.effectiveDate === '' || values.effectiveDate === undefined
          ? {}
          : { effectiveAt: toEffectiveAt(values.effectiveDate) }),
      }),
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      setServerError(serverErrorMessage(payload, 'Could not assign the owner.'));
      return;
    }
    toast.success('Owner assigned.');
    reset();
    router.refresh();
  });

  return (
    <form
      data-testid="ownership-assign-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <h3 className="text-sm font-semibold text-foreground">Assign owner</h3>
      {serverError !== null ? (
        <p
          data-testid="ownership-assign-error"
          role="alert"
          className="text-sm font-medium text-danger-foreground"
        >
          {serverError}
        </p>
      ) : null}
      <FormField
        label="Username"
        htmlFor="ownership-assign-username"
        error={errors.username?.message ?? ''}
        hint="Lowercase letters, digits, dots, and underscores. The account must already exist."
        required
      >
        <input
          data-testid="ownership-assign-username"
          type="text"
          required
          autoComplete="off"
          className={INPUT_CLASS}
          {...register('username')}
        />
      </FormField>
      <FormField
        label="Effective date (optional)"
        htmlFor="ownership-assign-date"
        error={errors.effectiveDate?.message ?? ''}
        hint="Defaults to today."
      >
        <input
          data-testid="ownership-assign-date"
          type="date"
          className={INPUT_CLASS}
          {...register('effectiveDate')}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="ownership-assign-submit" type="submit" loading={isSubmitting}>
          Assign owner
        </Button>
      </div>
    </form>
  );
}

function TransferForm({ roomId, owners }: { roomId: string; owners: OwnerOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { fromOwnershipId: '', toUsername: '', effectiveDate: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const owner = owners.find((entry) => entry.ownershipId === values.fromOwnershipId);
    if (owner === undefined) {
      setServerError('Select the current owner to transfer from.');
      return;
    }
    const response = await fetch(`/api/admin/rooms/${roomId}/ownerships`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'TRANSFER',
        fromUserId: owner.userId,
        toUsername: values.toUsername,
        effectiveAt: toEffectiveAt(values.effectiveDate),
      }),
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      setServerError(serverErrorMessage(payload, 'Could not transfer ownership.'));
      return;
    }
    toast.success('Ownership transferred.');
    reset();
    router.refresh();
  });

  return (
    <form
      data-testid="ownership-transfer-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <h3 className="text-sm font-semibold text-foreground">Transfer ownership</h3>
      {serverError !== null ? (
        <p
          data-testid="ownership-transfer-error"
          role="alert"
          className="text-sm font-medium text-danger-foreground"
        >
          {serverError}
        </p>
      ) : null}
      <FormField label="From owner" htmlFor="ownership-transfer-from" error={errors.fromOwnershipId?.message ?? ''} required>
        <select
          data-testid="ownership-transfer-from"
          className={INPUT_CLASS}
          {...register('fromOwnershipId')}
        >
          <option value="">Select an owner</option>
          {owners.map((owner) => (
            <option key={owner.ownershipId} value={owner.ownershipId}>
              {owner.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label="To username"
        htmlFor="ownership-transfer-to"
        error={errors.toUsername?.message ?? ''}
        hint="Lowercase letters, digits, dots, and underscores. The account must already exist."
        required
      >
        <input
          data-testid="ownership-transfer-to"
          type="text"
          required
          autoComplete="off"
          className={INPUT_CLASS}
          {...register('toUsername')}
        />
      </FormField>
      <FormField label="Effective date" htmlFor="ownership-transfer-date" error={errors.effectiveDate?.message ?? ''} required>
        <input
          data-testid="ownership-transfer-date"
          type="date"
          required
          className={INPUT_CLASS}
          {...register('effectiveDate')}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="ownership-transfer-submit" type="submit" loading={isSubmitting}>
          Transfer ownership
        </Button>
      </div>
    </form>
  );
}

function RemoveForm({ roomId, owners }: { roomId: string; owners: OwnerOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RemoveValues>({
    resolver: zodResolver(removeSchema),
    defaultValues: { ownershipId: '', effectiveDate: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/admin/rooms/${roomId}/ownerships`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'REMOVE',
        ownershipId: values.ownershipId,
        effectiveAt: toEffectiveAt(values.effectiveDate),
      }),
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      setServerError(serverErrorMessage(payload, 'Could not remove the owner.'));
      return;
    }
    toast.success('Owner removed.');
    reset();
    router.refresh();
  });

  return (
    <form
      data-testid="ownership-remove-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <h3 className="text-sm font-semibold text-foreground">Remove owner</h3>
      {serverError !== null ? (
        <p
          data-testid="ownership-remove-error"
          role="alert"
          className="text-sm font-medium text-danger-foreground"
        >
          {serverError}
        </p>
      ) : null}
      <FormField label="Owner" htmlFor="ownership-remove-owner" error={errors.ownershipId?.message ?? ''} required>
        <select
          data-testid="ownership-remove-owner"
          className={INPUT_CLASS}
          {...register('ownershipId')}
        >
          <option value="">Select an owner</option>
          {owners.map((owner) => (
            <option key={owner.ownershipId} value={owner.ownershipId}>
              {owner.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Effective date" htmlFor="ownership-remove-date" error={errors.effectiveDate?.message ?? ''} required>
        <input
          data-testid="ownership-remove-date"
          type="date"
          required
          className={INPUT_CLASS}
          {...register('effectiveDate')}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="ownership-remove-submit" type="submit" variant="destructive" loading={isSubmitting}>
          Remove owner
        </Button>
      </div>
    </form>
  );
}
