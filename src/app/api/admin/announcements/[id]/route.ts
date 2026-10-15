import 'server-only';
import { revalidatePath } from 'next/cache';
import { withApi } from '@/shared/auth/withApi';
import { requireAdmin } from '@/shared/auth/guards';
import { AppError } from '@/shared/utils/errors';
import { RATE_LIMIT_PRESETS } from '@/shared/utils/rateLimit';
import { systemClock } from '@/shared/utils/clock';
import {
  announcementPatchBody,
  createAnnouncementCtx,
  getAnnouncementDetail,
  parseWithFieldErrors,
  updateAnnouncementEntry,
} from '@/modules/announcements/application/index';

export const GET = withApi(
  async (_request, ctx, route) => {
    requireAdmin(ctx.actor);
    const params = await route?.params;
    const id = params?.id;
    if (id === undefined || id === '') {
      throw new AppError('VALIDATION_ERROR', 'The announcement id is invalid.');
    }
    const detail = await getAnnouncementDetail(ctx.actor, id, systemClock.now());
    if (detail === null) throw new AppError('RESOURCE_NOT_FOUND');
    return detail;
  },
  { rateLimit: RATE_LIMIT_PRESETS.generalApi ?? { capacity: 300, windowMs: 60_000 } },
);

export const PATCH = withApi(
  async (request, ctx, route) => {
    requireAdmin(ctx.actor);
    const params = await route?.params;
    const id = params?.id;
    if (id === undefined || id === '') {
      throw new AppError('VALIDATION_ERROR', 'The announcement id is invalid.');
    }
    const body = parseWithFieldErrors(announcementPatchBody, await request.json());
    const announcementCtx = createAnnouncementCtx({ requestId: ctx.requestId });
    const updated = await updateAnnouncementEntry(
      ctx.actor,
      id,
      {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
        ...(body.publishAt !== undefined ? { publishAt: body.publishAt } : {}),
        ...(body.hiddenAt !== undefined ? { hiddenAt: body.hiddenAt } : {}),
        ...(body.imageIds !== undefined ? { imageIds: body.imageIds } : {}),
      },
      announcementCtx,
    );
    revalidatePath('/announcements');
    revalidatePath(`/announcements/${updated.id}`);
    revalidatePath('/admin/announcements');
    return {
      id: updated.id,
      title: updated.title,
      body: updated.body,
      publishAt: updated.publishAt,
      hiddenAt: updated.hiddenAt,
      editedAt: updated.editedAt,
      revision: updated.revision,
      status: updated.status,
      images: updated.images,
    };
  },
  { rateLimit: RATE_LIMIT_PRESETS.generalApi ?? { capacity: 300, windowMs: 60_000 } },
);
