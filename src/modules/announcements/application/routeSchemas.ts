import { z } from 'zod';
import { parseWithFieldErrors as sharedParseWithFieldErrors } from '@/shared/utils/parseBody';

export const announcementListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AnnouncementListQuery = z.infer<typeof announcementListQuery>;

const imageIds = z.array(z.string().uuid()).max(5).default([]);

const publishMode = z.enum(['draft', 'now', 'scheduled']).optional();

interface ScheduledPublishCheck {
  publishMode?: 'draft' | 'now' | 'scheduled' | undefined;
  publishAt?: string | null | undefined;
}

function rejectPastScheduledPublish(value: ScheduledPublishCheck, ctx: z.RefinementCtx): void {
  if (value.publishMode !== 'scheduled') return;
  const timestamp = new Date(value.publishAt ?? '').getTime();
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    ctx.addIssue({
      code: 'custom',
      path: ['publishAt'],
      message: 'Choose a future publish date and time.',
    });
  }
}

export const announcementCreateBody = z
  .object({
    title: z.string().trim().min(1).max(255),
    body: z.string().trim().min(1).max(20000),
    publishAt: z.string().datetime({ offset: true }).nullable().optional(),
    publishMode,
    imageIds,
  })
  .strict()
  .superRefine(rejectPastScheduledPublish);

export type AnnouncementCreateBody = z.infer<typeof announcementCreateBody>;

export const announcementPatchBody = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    body: z.string().trim().min(1).max(20000).optional(),
    publishAt: z.string().datetime({ offset: true }).nullable().optional(),
    hiddenAt: z.string().datetime({ offset: true }).nullable().optional(),
    publishMode,
    imageIds: z.array(z.string().uuid()).max(5).optional(),
  })
  .strict()
  .superRefine(rejectPastScheduledPublish);

export type AnnouncementPatchBody = z.infer<typeof announcementPatchBody>;

export function parseWithFieldErrors<T>(schema: z.ZodType<T>, value: unknown): T {
  return sharedParseWithFieldErrors(schema, value);
}
