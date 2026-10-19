'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button, FormField, INPUT_CLASS, serverErrorMessage, useToast } from '@/shared/ui';

function buildAddSchema(requiresTenancy: boolean) {
  return z
    .object({
      username: z
        .string()
        .trim()
        .min(1, 'Username is required.')
        .max(30)
        .regex(/^[a-z0-9._]+$/, 'Use lowercase letters, digits, dots, and underscores.'),
      memberRole: z.enum(['MAIN', 'SUB']),
      tenancyId: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (requiresTenancy && (values.tenancyId ?? '') === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tenancyId'],
          message: 'Tenancy is required.',
        });
      }
    });
}

type AddValues = z.infer<ReturnType<typeof buildAddSchema>>;

export interface MemberTenancyOption {
  id: string;
  managementMode: string;
}

export function RoomMemberAddForm({
  roomId,
  activeTenancies,
}: {
  roomId: string;
  activeTenancies: MemberTenancyOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const requiresTenancy = activeTenancies.length > 0;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddValues>({
    resolver: zodResolver(buildAddSchema(requiresTenancy)),
    defaultValues: {
      username: '',
      memberRole: 'SUB',
      tenancyId: activeTenancies.length === 1 ? (activeTenancies[0]?.id ?? '') : '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/rooms/${roomId}/members`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: values.username,
        memberRole: values.memberRole,
        ...(values.tenancyId === '' || values.tenancyId === undefined
          ? {}
          : { tenancyId: values.tenancyId }),
      }),
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      setServerError(serverErrorMessage(payload, 'Could not add the member.'));
      return;
    }
    toast.success('Member added.');
    reset();
    router.refresh();
  });

  return (
    <form
      data-testid="room-member-add-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      {serverError !== null ? (
        <p
          data-testid="room-member-add-error"
          role="alert"
          className="text-body leading-body font-medium text-danger-foreground"
        >
          {serverError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Username"
          htmlFor="room-member-add-username"
          error={errors.username?.message ?? ''}
          hint="Lowercase letters, digits, dots, and underscores. The account must already exist."
          required
        >
          <input
            data-testid="room-member-add-username"
            type="text"
            required
            autoComplete="off"
            className={INPUT_CLASS}
            {...register('username')}
          />
        </FormField>
        <FormField label="Role" htmlFor="room-member-add-role">
          <select
            data-testid="room-member-add-role"
            className={INPUT_CLASS}
            {...register('memberRole')}
          >
            <option value="SUB">Member</option>
            <option value="MAIN">Main member</option>
          </select>
        </FormField>
      </div>
      {activeTenancies.length > 0 ? (
        <FormField
          label="Tenancy"
          htmlFor="room-member-add-tenancy"
          error={errors.tenancyId?.message ?? ''}
          hint="Members join through the active tenancy."
          required
        >
          <select
            data-testid="room-member-add-tenancy"
            className={INPUT_CLASS}
            {...register('tenancyId')}
          >
            <option value="">Select a tenancy</option>
            {activeTenancies.map((tenancy) => (
              <option key={tenancy.id} value={tenancy.id}>
                {tenancy.managementMode === 'PROJECT_MANAGED' ? 'Project managed' : 'Owner managed'}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button data-testid="room-member-add-submit" type="submit" loading={isSubmitting}>
          Add member
        </Button>
      </div>
    </form>
  );
}
