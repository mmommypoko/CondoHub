'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import {
  AnnouncementImageUploader,
  type UploadedImage,
} from '@/modules/announcements/ui/AnnouncementImageUploader';

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(255),
  body: z.string().trim().min(1, 'Body is required.').max(20000),
  publishMode: z.enum(['draft', 'now', 'scheduled']),
  publishAt: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;

function toIsoOrNull(mode: string, publishAt: string | undefined): string | null {
  if (mode === 'now') return new Date().toISOString();
  if (mode === 'scheduled' && publishAt !== undefined && publishAt !== '') {
    const parsed = new Date(publishAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

export function AnnouncementCreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { publishMode: 'draft' },
  });
  const publishMode = watch('publishMode');

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: values.title,
        body: values.body,
        publishAt: toIsoOrNull(values.publishMode, values.publishAt),
        imageIds: images.map((image) => image.imageId),
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setServerError(payload?.error?.message ?? 'Could not create the announcement.');
      return;
    }
    toast.success('Announcement created.');
    router.push('/admin/announcements');
    router.refresh();
  });

  return (
    <form
      data-testid="announcement-create-form"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {serverError !== null ? (
        <p data-testid="announcement-create-error" role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="announcement-create-title" className="text-sm font-medium text-foreground">
          Title
        </label>
        <input
          id="announcement-create-title"
          data-testid="announcement-create-title"
          type="text"
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? 'announcement-create-title-error' : undefined}
          className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('title')}
        />
        {errors.title !== undefined ? (
          <p id="announcement-create-title-error" role="alert" className="text-sm text-danger">
            {errors.title.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="announcement-create-body" className="text-sm font-medium text-foreground">
          Body
        </label>
        <textarea
          id="announcement-create-body"
          data-testid="announcement-create-body"
          rows={6}
          aria-invalid={errors.body !== undefined}
          aria-describedby={errors.body !== undefined ? 'announcement-create-body-error' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('body')}
        />
        {errors.body !== undefined ? (
          <p id="announcement-create-body-error" role="alert" className="text-sm text-danger">
            {errors.body.message}
          </p>
        ) : null}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Publishing</legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            data-testid="announcement-create-mode-draft"
            type="radio"
            value="draft"
            {...register('publishMode')}
          />
          Save as draft
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            data-testid="announcement-create-mode-now"
            type="radio"
            value="now"
            {...register('publishMode')}
          />
          Publish now
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            data-testid="announcement-create-mode-scheduled"
            type="radio"
            value="scheduled"
            {...register('publishMode')}
          />
          Schedule for later
        </label>
      </fieldset>
      {publishMode === 'scheduled' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="announcement-create-publish-at" className="text-sm font-medium text-foreground">
            Publish at
          </label>
          <input
            id="announcement-create-publish-at"
            data-testid="announcement-create-publish-at"
            type="datetime-local"
            className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('publishAt')}
          />
        </div>
      ) : null}
      <AnnouncementImageUploader
        images={images}
        onChange={setImages}
        testIdPrefix="announcement-create"
      />
      <div className="flex flex-wrap gap-2">
        <Button data-testid="announcement-create-submit" type="submit" loading={isSubmitting}>
          Create announcement
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/announcements')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
