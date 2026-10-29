import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFacilityById = vi.fn();
const listFacilityConfigs = vi.fn();
const listClosuresForFacility = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/shared/db/client', () => ({ db: {} }));

vi.mock('../infrastructure/facilityRepository', () => ({
  findFacilityById: (...args: unknown[]) => findFacilityById(...args),
  listFacilityConfigs: (...args: unknown[]) => listFacilityConfigs(...args),
  listClosuresForFacility: (...args: unknown[]) => listClosuresForFacility(...args),
}));

import { fakeActor } from '@/tests/fakes';
import type { FacilitySchedule } from '../domain/schedule';
import { getFacilityDetail } from './facilities';

function schedule(): FacilitySchedule {
  const closed = { open: [], breaks: [] };
  const weekday = { open: [{ start: '09:00', end: '17:00' }], breaks: [] };
  return {
    days: {
      '0': closed,
      '1': weekday,
      '2': weekday,
      '3': weekday,
      '4': weekday,
      '5': weekday,
      '6': closed,
    },
    holidays: [],
  };
}

describe('UT-FB-04 read side only shows future pendings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores a stale pending flag whose effectiveAt already passed', async () => {
    const at = new Date('2026-10-15T00:00:00.000Z');
    findFacilityById.mockResolvedValue({
      id: 'facility-1',
      projectId: 'project-1',
      code: 'arena',
      name: 'Arena',
      description: null,
      status: 'ACTIVE' as const,
      capacity: 2,
    });
    listFacilityConfigs.mockResolvedValue([
      {
        id: 'config-4',
        facilityId: 'facility-1',
        version: 4,
        effectiveAt: new Date('2026-10-14T00:00:00.000Z'),
        isPending: true,
        scheduleJson: schedule(),
        slotMinutes: 60,
        quotaKind: 'WEEKLY' as const,
        quotaLimit: 2,
        advanceDays: 30,
        createdAt: new Date('2026-10-13T00:00:00.000Z'),
      },
    ]);
    listClosuresForFacility.mockResolvedValue([]);

    const detail = await getFacilityDetail(fakeActor({ isSystemAdmin: true }), 'facility-1', at);

    expect(detail?.pendingConfig).toBeNull();
    expect(detail?.effectiveConfig?.version).toBe(4);
  });

  it('still returns a genuine future pending', async () => {
    const at = new Date('2026-10-15T00:00:00.000Z');
    findFacilityById.mockResolvedValue({
      id: 'facility-1',
      projectId: 'project-1',
      code: 'arena',
      name: 'Arena',
      description: null,
      status: 'ACTIVE' as const,
      capacity: 2,
    });
    listFacilityConfigs.mockResolvedValue([
      {
        id: 'config-4',
        facilityId: 'facility-1',
        version: 4,
        effectiveAt: new Date('2026-10-20T00:00:00.000Z'),
        isPending: true,
        scheduleJson: schedule(),
        slotMinutes: 60,
        quotaKind: 'WEEKLY' as const,
        quotaLimit: 2,
        advanceDays: 30,
        createdAt: new Date('2026-10-14T00:00:00.000Z'),
      },
      {
        id: 'config-3',
        facilityId: 'facility-1',
        version: 3,
        effectiveAt: new Date('2026-10-01T00:00:00.000Z'),
        isPending: false,
        scheduleJson: schedule(),
        slotMinutes: 60,
        quotaKind: 'WEEKLY' as const,
        quotaLimit: 5,
        advanceDays: 30,
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    ]);
    listClosuresForFacility.mockResolvedValue([]);

    const detail = await getFacilityDetail(fakeActor({ isSystemAdmin: true }), 'facility-1', at);

    expect(detail?.pendingConfig?.version).toBe(4);
    expect(detail?.effectiveConfig?.version).toBe(3);
  });
});
