'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Badge, Button, FormField, INPUT_BASE_CLASS, cx, useToast } from '@/shared/ui';
import {
  AnnouncementImageUploader,
  type UploadedImage,
} from '@/modules/announcements/ui/AnnouncementImageUploader';

const editSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(255),
  body: z.string().trim().min(1, 'Body is required.').max(20000),
  publishAt: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

export interface EditInitialImage {
  imageId: string;
  byteSize: number;
  mime: string;
}

export interface EditRevision {
  version: number;
  createdAt: string;
  snapshot: unknown;
}

interface ErrorPayload {
  error?: { message?: string };
}

function toLocalInput(value: string | null): string {
  if (value === null) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AnnouncementEditForm({
  announcementId,
  initialTitle,
  initialBody,
  initialPublishAt,
  initialHiddenAt,
  initialImages,
  revisions,
}: {
  announcementId: string;
  initialTitle: string;
  initialBody: string;
  initialPublishAt: string | null;
  initialHiddenAt: string | null;
  initialImages: EditInitialImage[];
  revisions: EditRevision[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [images, setImages] = useState<UploadedImage[]>(
    initialImages.map((image, index) => ({
      imageId: image.imageId,
      fileName: `Attached image ${index + 1}`,
      byteSize: image.byteSize,
      mimeVerified: image.mime,
    })),
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [hiddenAt, setHiddenAt] = useState<string | null>(initialHiddenAt);
  const [busyAction, setBusyAction] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: initialTitle,
      body: initialBody,
      publishAt: toLocalInput(initialPublishAt),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    let publishAt: string | null = null;
    if (values.publishAt !== undefined && values.publishAt !== '') {
      const parsed = new Date(values.publishAt);
      if (Number.isNaN(parsed.getTime())) {
        setServerError('The publish date is invalid.');
        return;
      }
      publishAt = parsed.toISOString();
    }
    const response = await fetch(`/api/admin/announcements/${announcementId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: values.title,
        body: values.body,
        publishAt,
        imageIds: images.map((image) => image.imageId),
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      setServerError(payload?.error?.message ?? 'Could not save this announcement. Check the form and retry.');
      return;
    }
    toast.success('Announcement saved.');
    router.push('/admin/announcements');
    router.refresh();
  });

  async function setHidden(nextHidden: string | null): Promise<void> {
    setBusyAction(true);
    setServerError(null);
    try {
      const response = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hiddenAt: nextHidden }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setServerError(payload?.error?.message ?? 'Could not update visibility. Retry in a moment.');
        return;
      }
      setHiddenAt(nextHidden);
      toast.success(nextHidden === null ? 'Announcement restored.' : 'Announcement hidden.');
      router.refresh();
    } finally {
      setBusyAction(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <form
        data-testid="announcement-edit-form"
        onSubmit={onSubmit}
        noValidate
        className="flex min-w-0 flex-col gap-4"
      >
        {serverError !== null ? (
          <p data-testid="announcement-edit-error" role="alert" className="text-body leading-body font-medium text-danger-foreground">
            {serverError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
          <span className="text-small leading-small text-muted-foreground">Visibility:</span>
          {hiddenAt === null ? (
            <Badge data-testid="announcement-edit-visible" variant="success">
              Visible
            </Badge>
          ) : (
            <Badge data-testid="announcement-edit-hidden" variant="danger">
              Hidden
            </Badge>
          )}
          <span className="flex-1" />
          {hiddenAt === null ? (
            <Button
              data-testid="announcement-edit-hide-btn"
              type="button"
              variant="secondary"
              size="sm"
              loading={busyAction}
              onClick={() => void setHidden(new Date().toISOString())}
            >
              Hide
            </Button>
          ) : (
            <Button
              data-testid="announcement-edit-restore-btn"
              type="button"
              variant="secondary"
              size="sm"
              loading={busyAction}
              onClick={() => void setHidden(null)}
            >
              Restore
            </Button>
          )}
        </div>
        <FormField label="Title" htmlFor="announcement-edit-title" {...(errors.title?.message === undefined ? {} : { error: errors.title.message })} required>
          <input
            data-testid="announcement-edit-title"
            type="text"
            required
            className={cx(INPUT_BASE_CLASS, 'h-10')}
            {...register('title')}
          />
        </FormField>
        <FormField label="Body" htmlFor="announcement-edit-body" {...(errors.body?.message === undefined ? {} : { error: errors.body.message })} required>
          <textarea
            data-testid="announcement-edit-body"
            rows={6}
            required
            className={cx(INPUT_BASE_CLASS, 'py-2 leading-6')}
            {...register('body')}
          />
        </FormField>
        <FormField label="Publish at (empty means draft)" htmlFor="announcement-edit-publish-at">
          <input
            data-testid="announcement-edit-publish-at"
            type="datetime-local"
            className={cx(INPUT_BASE_CLASS, 'h-10')}
            {...register('publishAt')}
          />
        </FormField>
        <AnnouncementImageUploader
          images={images}
          onChange={setImages}
          testIdPrefix="announcement-edit"
        />
        <div className="flex flex-wrap gap-2">
          <Button data-testid="announcement-edit-submit" type="submit" loading={isSubmitting}>
            Save changes
          </Button>
          <Button
            data-testid="announcement-edit-cancel"
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/announcements')}
          >
            Cancel
          </Button>
        </div>
      </form>
      <section className="flex min-w-0 flex-col gap-2 border-t border-border pt-6" aria-label="Revision history">
        <h2 className="text-heading leading-heading font-semibold text-foreground">
          Revision history ({revisions.length})
        </h2>
        {revisions.length === 0 ? (
          <p data-testid="announcement-edit-no-revisions" className="text-small leading-small text-muted-foreground">
            No revisions yet. Editing after publish creates a revision snapshot.
          </p>
        ) : (
          <ul data-testid="announcement-edit-revisions" className="flex min-w-0 flex-col">
            {revisions.map((revision) => (
              <li
                key={revision.version}
                className="flex min-w-0 flex-col gap-0.5 border-b border-border py-3 text-body leading-body last:border-b-0"
              >
                <span className="font-medium leading-6 text-foreground">
                  Version {revision.version} · {new Date(revision.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}
                </span>
                <span className="break-words leading-6 text-muted-foreground">
                  {snapshotSummary(revision.snapshot)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function snapshotSummary(snapshot: unknown): string {
  if (typeof snapshot !== 'object' || snapshot === null) return 'Snapshot recorded.';
  const record = snapshot as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title : 'Untitled';
  const images = Array.isArray(record.imageIds) ? record.imageIds.length : 0;
  return `${title} · ${images} ${images === 1 ? 'image' : 'images'}`;
}
