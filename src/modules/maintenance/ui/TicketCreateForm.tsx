'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import {
  TicketImageUploader,
  type TicketUploadedImage,
} from '@/modules/maintenance/ui/TicketImageUploader';
import {
  maintenanceRoutingKindOptions,
  ticketCreateFormSchema,
  type TicketCreateFormValues,
} from '@/modules/maintenance/ui/maintenanceFormSchemas';

export interface TicketRoomOption {
  id: string;
  label: string;
}

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

interface CreateEnvelope {
  data?: { id?: string };
}

const KIND_META: Record<string, { label: string; hint: string }> = {
  COMMON_AREA: {
    label: 'Common area',
    hint: 'Lobbies, lifts, pools, and other shared spaces. No room needed.',
  },
  PRIVATE_OWNER: {
    label: 'Owner room',
    hint: 'Inside an owner-managed room. The room owners handle it.',
  },
  PROJECT_MANAGED_PRIVATE: {
    label: 'Managed room',
    hint: 'Inside a project-managed room. The management team handles it.',
  },
};

function createErrorCopy(code: string | undefined, fallback: string): string {
  if (code === 'RESOURCE_NOT_FOUND' || code === 'ACCESS_DENIED') {
    return 'This request is not available.';
  }
  if (code === 'RATE_LIMITED') return 'Too many requests. Please wait a moment and retry.';
  return fallback;
}

export function TicketCreateForm({
  privateRooms,
  managedRooms,
}: {
  privateRooms: TicketRoomOption[];
  managedRooms: TicketRoomOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [images, setImages] = useState<TicketUploadedImage[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TicketCreateFormValues>({
    resolver: zodResolver(ticketCreateFormSchema),
    defaultValues: {
      routingKind: 'COMMON_AREA',
      roomId: '',
      locationDescription: '',
      subject: '',
      description: '',
    },
  });
  const routingKind = watch('routingKind');
  const roomOptions = routingKind === 'PRIVATE_OWNER' ? privateRooms : managedRooms;

  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          routingKind: values.routingKind,
          ...(values.roomId !== undefined && values.roomId !== '' ? { roomId: values.roomId } : {}),
          locationDescription: values.locationDescription,
          subject: values.subject,
          description: values.description,
          imageIds: images.map((image) => image.imageId),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setServerError(
          createErrorCopy(payload?.error?.code, payload?.error?.message ?? 'Could not submit the request.'),
        );
        return;
      }
      const payload = (await response.json().catch(() => null)) as CreateEnvelope | null;
      const id = payload?.data?.id;
      if (id === undefined || id === '') {
        setServerError('The request was submitted but the response was empty. Reload the page.');
        return;
      }
      toast.success('Request submitted.');
      router.push(`/maintenance/${id}`);
      router.refresh();
    },
    (invalid) => {
      if (invalid.roomId !== undefined) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.getElementById('maintenance-create-room')?.focus({ preventScroll: false });
          });
        });
        return;
      }
      const target =
        invalid.locationDescription !== undefined
          ? document.getElementById('maintenance-create-location')
          : invalid.subject !== undefined
            ? document.getElementById('maintenance-create-subject')
            : invalid.description !== undefined
              ? document.getElementById('maintenance-create-description')
              : null;
      if (target !== null) {
        target.focus({ preventScroll: false });
        target.scrollIntoView({ block: 'nearest' });
      }
    },
  );

  return (
    <form data-testid="maintenance-create-form" onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5">
      {serverError !== null ? (
        <p data-testid="maintenance-create-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="text-sm font-semibold text-foreground">Category</legend>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
          {maintenanceRoutingKindOptions.map((kind) => {
            const meta = KIND_META[kind] ?? { label: kind, hint: '' };
            return (
              <label
                key={kind}
                className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <input
                  data-testid={`maintenance-create-kind-${kind}`}
                  type="radio"
                  value={kind}
                  className="mt-0.5 size-4 shrink-0"
                  {...register('routingKind', {
                    onChange: () => setValue('roomId', '', { shouldValidate: true }),
                  })}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{meta.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.routingKind !== undefined ? (
          <p data-testid="maintenance-create-kind-error" role="alert" className="text-sm text-danger">
            {errors.routingKind.message}
          </p>
        ) : null}
      </fieldset>
      {routingKind !== 'COMMON_AREA' ? (
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="maintenance-create-room" className="text-sm font-medium text-foreground">
            Room
          </label>
          <select
            id="maintenance-create-room"
            data-testid="maintenance-create-room"
            aria-invalid={errors.roomId !== undefined}
            aria-describedby={errors.roomId !== undefined ? 'maintenance-create-room-error' : undefined}
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('roomId')}
          >
            <option value="">Select a room</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
          {roomOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No eligible rooms for this category. Check your memberships first.
            </p>
          ) : null}
          {errors.roomId !== undefined ? (
            <p id="maintenance-create-room-error" data-testid="maintenance-create-room-error" role="alert" className="text-sm text-danger">
              {errors.roomId.message}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="maintenance-create-location" className="text-sm font-medium text-foreground">
          Location
        </label>
        <input
          id="maintenance-create-location"
          data-testid="maintenance-create-location"
          type="text"
          maxLength={1000}
          placeholder="Tower B lobby, near the lift hall"
          aria-invalid={errors.locationDescription !== undefined}
          aria-describedby={errors.locationDescription !== undefined ? 'maintenance-create-location-error' : undefined}
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('locationDescription')}
        />
        {errors.locationDescription !== undefined ? (
          <p id="maintenance-create-location-error" data-testid="maintenance-create-location-error" role="alert" className="text-sm text-danger">
            {errors.locationDescription.message}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="maintenance-create-subject" className="text-sm font-medium text-foreground">
          Subject
        </label>
        <input
          id="maintenance-create-subject"
          data-testid="maintenance-create-subject"
          type="text"
          maxLength={255}
          placeholder="Flickering light in the lobby"
          aria-invalid={errors.subject !== undefined}
          aria-describedby={errors.subject !== undefined ? 'maintenance-create-subject-error' : undefined}
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('subject')}
        />
        {errors.subject !== undefined ? (
          <p id="maintenance-create-subject-error" data-testid="maintenance-create-subject-error" role="alert" className="text-sm text-danger">
            {errors.subject.message}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="maintenance-create-description" className="text-sm font-medium text-foreground">
          Details
        </label>
        <textarea
          id="maintenance-create-description"
          data-testid="maintenance-create-description"
          rows={5}
          maxLength={20000}
          placeholder="Describe the problem, when it started, and anything the handler should know."
          aria-invalid={errors.description !== undefined}
          aria-describedby={errors.description !== undefined ? 'maintenance-create-description-error' : undefined}
          className="w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('description')}
        />
        {errors.description !== undefined ? (
          <p id="maintenance-create-description-error" data-testid="maintenance-create-description-error" role="alert" className="text-sm text-danger">
            {errors.description.message}
          </p>
        ) : null}
      </div>
      <TicketImageUploader
        images={images}
        onChange={setImages}
        testIdPrefix="maintenance-create"
        maxImages={5}
        entityType="maintenance_request"
      />
      <div className="flex flex-wrap gap-2">
        <Button data-testid="maintenance-create-submit" type="submit" loading={isSubmitting}>
          Submit request
        </Button>
        <Button
          data-testid="maintenance-create-cancel"
          type="button"
          variant="secondary"
          onClick={() => router.push('/maintenance')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
