'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import {
  TicketImageUploader,
  type TicketUploadedImage,
} from '@/modules/maintenance/ui/TicketImageUploader';
import {
  ticketCommentFormSchema,
  type TicketCommentFormValues,
} from '@/modules/maintenance/ui/maintenanceFormSchemas';

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

function commentErrorCopy(code: string | undefined, fallback: string): string {
  if (code === 'RESOURCE_NOT_FOUND' || code === 'ACCESS_DENIED') {
    return 'This request is not available.';
  }
  if (code === 'RATE_LIMITED') return 'Too many requests. Please wait a moment and retry.';
  return fallback;
}

export function TicketCommentForm({
  ticketId,
  testIdPrefix,
  onCommented,
}: {
  ticketId: string;
  testIdPrefix: string;
  onCommented: () => void;
}) {
  const { toast } = useToast();
  const [images, setImages] = useState<TicketUploadedImage[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketCommentFormValues>({
    resolver: zodResolver(ticketCommentFormSchema),
    defaultValues: { body: '' },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      const response = await fetch(`/api/maintenance/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          body: values.body,
          imageIds: images.map((image) => image.imageId),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setServerError(
          commentErrorCopy(payload?.error?.code, payload?.error?.message ?? 'Could not post the comment.'),
        );
        return;
      }
      toast.success('Comment posted.');
      reset();
      setImages([]);
      onCommented();
    },
    () => setFocus('body'),
  );

  return (
    <form data-testid={`${testIdPrefix}-comment-form`} onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-3">
      {serverError !== null ? (
        <p data-testid={`${testIdPrefix}-comment-error`} role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`${testIdPrefix}-comment-body`} className="text-sm font-medium text-foreground">
          Add a comment
        </label>
        <textarea
          id={`${testIdPrefix}-comment-body`}
          data-testid={`${testIdPrefix}-comment-body`}
          rows={4}
          maxLength={20000}
          placeholder="Share an update or ask for clarification."
          aria-invalid={errors.body !== undefined}
          aria-describedby={errors.body !== undefined ? `${testIdPrefix}-comment-body-error` : undefined}
          className="w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('body')}
        />
        {errors.body !== undefined ? (
          <p id={`${testIdPrefix}-comment-body-error`} data-testid={`${testIdPrefix}-comment-body-error`} role="alert" className="text-sm text-danger">
            {errors.body.message}
          </p>
        ) : null}
      </div>
      <TicketImageUploader
        images={images}
        onChange={setImages}
        testIdPrefix={`${testIdPrefix}-comment`}
        maxImages={3}
        entityType="maintenance_comment"
      />
      <div>
        <Button data-testid={`${testIdPrefix}-comment-submit`} type="submit" loading={isSubmitting} size="sm">
          Post comment
        </Button>
      </div>
    </form>
  );
}
