import 'server-only';
import { withApi } from '@/shared/auth/withApi';
import { requireAdmin } from '@/shared/auth/guards';
import { AppError } from '@/shared/utils/errors';
import { RATE_LIMIT_PRESETS } from '@/shared/utils/rateLimit';
import {
  createPropertyCtx,
  updateBuildingDetails,
  disableBuilding,
  enableBuilding,
  parseWithFieldErrors,
} from '@/modules/property-membership/application/index';
import { buildingPatchBody } from '@/modules/property-membership/application/routeSchemas';

export const PATCH = withApi(
  async (request, ctx, route) => {
    requireAdmin(ctx.actor);
    const params = await route?.params;
    const buildingId = params?.buildingId;
    if (buildingId === undefined || buildingId === '') {
      throw new AppError('VALIDATION_ERROR', 'The building id is invalid.');
    }
    const body = parseWithFieldErrors(buildingPatchBody, await request.json());
    const propertyCtx = createPropertyCtx({ requestId: ctx.requestId });
    if (body.name !== undefined)
      return updateBuildingDetails(ctx.actor, buildingId, body, propertyCtx);
    if (body.status === 'INACTIVE') {
      return disableBuilding(ctx.actor, buildingId, propertyCtx);
    }
    return enableBuilding(ctx.actor, buildingId, propertyCtx);
  },
  { rateLimit: RATE_LIMIT_PRESETS.generalApi ?? { capacity: 300, windowMs: 60_000 } },
);
