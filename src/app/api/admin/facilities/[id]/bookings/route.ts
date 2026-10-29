import 'server-only';
import { paged, withApi } from '@/shared/auth/withApi';
import { requireAdmin } from '@/shared/auth/guards';
import { AppError } from '@/shared/utils/errors';
import { RATE_LIMIT_PRESETS } from '@/shared/utils/rateLimit';
import {
  facilityBookingsQuery,
  listFacilityBookings,
  parseWithFieldErrors,
} from '@/modules/facility-booking/application/index';

export const GET = withApi(
  async (request, ctx, route) => {
    requireAdmin(ctx.actor);
    const params = await route?.params;
    const id = params?.id;
    if (id === undefined || id === '') {
      throw new AppError('VALIDATION_ERROR', 'The facility id is invalid.');
    }
    const url = new URL(request.url);
    const query = parseWithFieldErrors(facilityBookingsQuery, {
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
    });
    const feed = await listFacilityBookings(ctx.actor, {
      facilityId: id,
      page: query.page,
      pageSize: query.pageSize,
    });
    return paged(
      {
        bookings: feed.rows.map((row) => ({
          id: row.booking.id,
          roomId: row.booking.roomId,
          createdAt: row.booking.createdAt.toISOString(),
          slots: row.slots.map((slot) => ({
            id: slot.id,
            startsAt: slot.startsAt.toISOString(),
            endsAt: slot.endsAt.toISOString(),
            state: slot.state,
            refundQuota: slot.refundQuota,
          })),
        })),
      },
      { page: query.page, pageSize: query.pageSize, total: feed.total },
    );
  },
  { rateLimit: RATE_LIMIT_PRESETS.generalApi ?? { capacity: 300, windowMs: 60_000 } },
);
