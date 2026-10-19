'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button, FormField, INPUT_BASE_CLASS, cx, useToast } from '@/shared/ui';
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

const PUBLISH_MODES = [
  { value: 'draft', testId: 'announcement-create-mode-draft', label: 'Save as draft' },
  { value: 'now', testId: 'announcement-create-mode-now', label: 'Publish now' },
  { value: 'scheduled', testId: 'announcement-create-mode-scheduled', label: 'Schedule for later' },
] as const;

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
      setServerError(payload?.error?.message ?? 'Could not create this announcement. Check the form and retry.');
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
      className="flex min-w-0 flex-col gap-4"
    >
      {serverError !== null ? (
        <p data-testid="announcement-create-error" role="alert" className="text-body leading-body font-medium text-danger-foreground">
          {serverError}
        </p>
      ) : null}
      <FormField label="Title" htmlFor="announcement-create-title" {...(errors.title?.message === undefined ? {} : { error: errors.title.message })} required>
        <input
          data-testid="announcement-create-title"
          type="text"
          required
          className={cx(INPUT_BASE_CLASS, 'h-10')}
          {...register('title')}
        />
      </FormField>
      <FormField label="Body" htmlFor="announcement-create-body" {...(errors.body?.message === undefined ? {} : { error: errors.body.message })} required>
        <textarea
          data-testid="announcement-create-body"
          rows={6}
          required
          className={cx(INPUT_BASE_CLASS, 'py-2 leading-6')}
          {...register('body')}
        />
      </FormField>
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="text-body leading-body font-medium text-foreground">Publishing</legend>
        <div className="flex min-w-0 flex-col gap-1">
          {PUBLISH_MODES.map((mode) => (
            <label
              key={mode.value}
              className="flex w-fit cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-body leading-body text-foreground transition-[background-color] duration-150 ease-out hover:bg-secondary motion-reduce:transition-none"
            >
              <input
                data-testid={mode.testId}
                type="radio"
                value={mode.value}
                className="size-4 shrink-0 accent-primary"
                {...register('publishMode')}
              />
              {mode.label}
            </label>
          ))}
        </div>
      </fieldset>
      {publishMode === 'scheduled' ? (
        <FormField label="Publish at" htmlFor="announcement-create-publish-at">
          <input
            data-testid="announcement-create-publish-at"
            type="datetime-local"
            className={cx(INPUT_BASE_CLASS, 'h-10')}
            {...register('publishAt')}
          />
        </FormField>
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
          data-testid="announcement-create-cancel"
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
