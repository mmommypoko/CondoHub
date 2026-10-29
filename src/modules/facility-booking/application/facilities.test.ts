import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFacilityById = vi.fn();
const queryFacilityBookingPage = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/shared/db/client', () => ({ db: {} }));

vi.mock('../infrastructure/facilityRepository', () => ({
  findFacilityById: (...args: unknown[]) => findFacilityById(...args),
  queryFacilityBookingPage: (...args: unknown[]) => queryFacilityBookingPage(...args),
}));

import { db } from '@/shared/db/client';
import { fakeActor } from '@/tests/fakes';
import { listFacilityBookings } from './facilities';

describe('UT-FB-15 admin facility bookings honor page and pageSize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clamps paging and returns the repository envelope', async () => {
    findFacilityById.mockResolvedValue({
      id: 'facility-1',
      projectId: 'project-1',
      code: 'arena',
      name: 'Arena',
      description: null,
      status: 'ACTIVE' as const,
      capacity: 2,
    });
    const page = {
      rows: [
        {
          booking: {
            id: 'booking-1',
            roomId: 'room-1',
            facilityId: 'facility-1',
            createdBy: null,
            createdAt: new Date('2026-10-15T00:00:00.000Z'),
          },
          slots: [],
        },
      ],
      total: 41,
    };
    queryFacilityBookingPage.mockResolvedValue(page);

    const result = await listFacilityBookings(fakeActor({ isSystemAdmin: true }), {
      facilityId: 'facility-1',
      page: 3,
      pageSize: 200,
    });

    expect(queryFacilityBookingPage).toHaveBeenCalledWith(db, 'facility-1', 3, 100);
    expect(result).toEqual(page);
  });

  it('rejects missing facilities and non-admin actors', async () => {
    findFacilityById.mockResolvedValue(null);
    await expect(
      listFacilityBookings(fakeActor({ isSystemAdmin: true }), {
        facilityId: 'missing',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    await expect(
      listFacilityBookings(fakeActor(), { facilityId: 'facility-1', page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    expect(queryFacilityBookingPage).not.toHaveBeenCalled();
  });
});
