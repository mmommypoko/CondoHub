import 'server-only';
import { withApi } from '@/shared/auth/withApi';
import { requireActiveActor } from '@/shared/auth/guards';
import { AppError } from '@/shared/utils/errors';
import { RATE_LIMIT_PRESETS } from '@/shared/utils/rateLimit';
import {
  createPropertyCtx,
  endTenancyAt,
  listRoomTenancies,
  parseWithFieldErrors,
} from '@/modules/property-membership/application/index';
import { tenancyPatchBody } from '@/modules/property-membership/application/routeSchemas';

export const PATCH = withApi(
  async (request, ctx, route) => {
    requireActiveActor(ctx.actor);
    const params = await route?.params;
    const roomId = params?.roomId;
    const tenancyId = params?.tenancyId;
    if (roomId === undefined || roomId === '' || tenancyId === undefined || tenancyId === '') {
      throw new AppError('VALIDATION_ERROR', 'The room or tenancy id is invalid.');
    }
    const body = parseWithFieldErrors(tenancyPatchBody, await request.json());
    const propertyCtx = createPropertyCtx({ requestId: ctx.requestId });
    const scoped = await listRoomTenancies(roomId);
    if (!scoped.some((tenancy) => tenancy.id === tenancyId)) {
      throw new AppError('RESOURCE_NOT_FOUND');
    }
    const ended = await endTenancyAt(
      ctx.actor,
      {
        tenancyId,
        endsAt: body.endsAt === undefined ? undefined : new Date(body.endsAt),
      },
      propertyCtx,
    );
    return {
      id: ended.id,
      roomId: ended.roomId,
      endsAt: ended.endsAt === null ? null : ended.endsAt.toISOString(),
      state: ended.state,
    };
  },
  { rateLimit: RATE_LIMIT_PRESETS.generalApi ?? { capacity: 300, windowMs: 60_000 } },
);
