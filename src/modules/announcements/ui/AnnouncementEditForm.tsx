'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { useToast } from '@/shared/ui/Toast';
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
      setServerError(payload?.error?.message ?? 'Could not save the announcement.');
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
        setServerError(payload?.error?.message ?? 'Could not update visibility.');
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
    <div className="flex flex-col gap-6">
      <form
        data-testid="announcement-edit-form"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        {serverError !== null ? (
          <p data-testid="announcement-edit-error" role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Visibility:</span>
          {hiddenAt === null ? (
            <Badge data-testid="announcement-edit-visible" variant="success">
              Visible
            </Badge>
          ) : (
            <Badge data-testid="announcement-edit-hidden" variant="danger">
              Hidden
            </Badge>
          )}
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
        <div className="flex flex-col gap-1">
          <label htmlFor="announcement-edit-title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="announcement-edit-title"
            data-testid="announcement-edit-title"
            type="text"
            aria-invalid={errors.title !== undefined}
            aria-describedby={errors.title !== undefined ? 'announcement-edit-title-error' : undefined}
            className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('title')}
          />
          {errors.title !== undefined ? (
            <p id="announcement-edit-title-error" role="alert" className="text-sm text-danger">
              {errors.title.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="announcement-edit-body" className="text-sm font-medium text-foreground">
            Body
          </label>
          <textarea
            id="announcement-edit-body"
            data-testid="announcement-edit-body"
            rows={6}
            aria-invalid={errors.body !== undefined}
            aria-describedby={errors.body !== undefined ? 'announcement-edit-body-error' : undefined}
            className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('body')}
          />
          {errors.body !== undefined ? (
            <p id="announcement-edit-body-error" role="alert" className="text-sm text-danger">
              {errors.body.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="announcement-edit-publish-at" className="text-sm font-medium text-foreground">
            Publish at (empty means draft)
          </label>
          <input
            id="announcement-edit-publish-at"
            data-testid="announcement-edit-publish-at"
            type="datetime-local"
            className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            {...register('publishAt')}
          />
        </div>
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
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/announcements')}
          >
            Cancel
          </Button>
        </div>
      </form>
      <section className="flex flex-col gap-2" aria-label="Revision history">
        <h2 className="text-sm font-semibold text-foreground">
          Revision history ({revisions.length})
        </h2>
        {revisions.length === 0 ? (
          <p data-testid="announcement-edit-no-revisions" className="text-sm text-muted-foreground">
            No revisions yet. Editing after publish creates a revision snapshot.
          </p>
        ) : (
          <ul data-testid="announcement-edit-revisions" className="flex flex-col gap-2">
            {revisions.map((revision) => (
              <li
                key={revision.version}
                className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span className="font-medium text-foreground">
                  Version {revision.version} · {new Date(revision.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}
                </span>
                <span className="break-words text-muted-foreground">
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
