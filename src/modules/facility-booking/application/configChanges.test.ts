import { beforeEach, describe, expect, it, vi } from 'vitest';

const findPendingConfig = vi.fn();
const insertFacilityConfig = vi.fn();
const clearStalePendingFlags = vi.fn();
const findEffectiveConfig = vi.fn();
const findFacilityById = vi.fn();
const maxConfigVersion = vi.fn();
const listConfirmedFutureSlots = vi.fn();
const listQuotaConsumingSlots = vi.fn();
const listAdjustmentsForRoomFacility = vi.fn();
const listClosuresOverlapping = vi.fn();
const findConfigById = vi.fn();
const getIdempotencyRecord = vi.fn();
const upsertIdempotencyRecord = vi.fn();
const writeAudit = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/shared/db/client', () => ({ db: { transaction: vi.fn() } }));

vi.mock('../infrastructure/facilityRepository', () => ({
  findPendingConfig: (...args: unknown[]) => findPendingConfig(...args),
  insertFacilityConfig: (...args: unknown[]) => insertFacilityConfig(...args),
  clearStalePendingFlags: (...args: unknown[]) => clearStalePendingFlags(...args),
  findEffectiveConfig: (...args: unknown[]) => findEffectiveConfig(...args),
  findFacilityById: (...args: unknown[]) => findFacilityById(...args),
  maxConfigVersion: (...args: unknown[]) => maxConfigVersion(...args),
  listConfirmedFutureSlots: (...args: unknown[]) => listConfirmedFutureSlots(...args),
  listQuotaConsumingSlots: (...args: unknown[]) => listQuotaConsumingSlots(...args),
  listAdjustmentsForRoomFacility: (...args: unknown[]) => listAdjustmentsForRoomFacility(...args),
  listClosuresOverlapping: (...args: unknown[]) => listClosuresOverlapping(...args),
  findConfigById: (...args: unknown[]) => findConfigById(...args),
}));

vi.mock('./idempotencyStore', () => ({
  getIdempotencyRecord: (...args: unknown[]) => getIdempotencyRecord(...args),
  upsertIdempotencyRecord: (...args: unknown[]) => upsertIdempotencyRecord(...args),
}));

vi.mock('@/shared/observability/audit', () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

import { db } from '@/shared/db/client';
import { fakeActor, fakeClock } from '@/tests/fakes';
import { previewFingerprint } from '../domain/configPolicy';
import type { FacilitySchedule } from '../domain/schedule';
import { commitConfigChange, encodePreviewToken } from './configChanges';

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

function proposed(): {
  schedule: FacilitySchedule;
  slotMinutes: number;
  capacity: number;
  quotaKind: 'WEEKLY';
  quotaLimit: number;
  advanceDays: number;
} {
  return {
    schedule: schedule(),
    slotMinutes: 60,
    capacity: 2,
    quotaKind: 'WEEKLY',
    quotaLimit: 5,
    advanceDays: 30,
  };
}

const tx = { marker: 'tx' };

describe('UT-FB-04 commit clears stale pending flags before the pending check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears pendings whose effectiveAt has passed and then commits', async () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const effectiveAt = new Date('2026-10-16T00:00:00.000Z');
    const clock = fakeClock(now);
    const actor = fakeActor({ isSystemAdmin: true });
    const body = proposed();
    const fingerprint = previewFingerprint({ configVersion: 3, confirmedFutureSlotIds: [] });
    const previewToken = encodePreviewToken({
      facilityId: 'facility-1',
      configVersion: 3,
      effectiveAt: effectiveAt.toISOString(),
      proposed: body,
      fingerprint,
    });
    const facility = {
      id: 'facility-1',
      projectId: 'project-1',
      code: 'arena',
      name: 'Arena',
      description: null,
      status: 'ACTIVE' as const,
      capacity: 2,
    };
    const current = {
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
    };
    const calls: string[] = [];
    findFacilityById.mockResolvedValue(facility);
    findEffectiveConfig.mockResolvedValue(current);
    listConfirmedFutureSlots.mockResolvedValue([]);
    listQuotaConsumingSlots.mockResolvedValue([]);
    listAdjustmentsForRoomFacility.mockResolvedValue([]);
    listClosuresOverlapping.mockResolvedValue([]);
    clearStalePendingFlags.mockImplementation(async () => {
      calls.push('clear');
      return 1;
    });
    findPendingConfig.mockImplementation(async () => {
      calls.push('check');
      return null;
    });
    maxConfigVersion.mockResolvedValue(3);
    insertFacilityConfig.mockImplementation(
      async (_conn: unknown, input: Record<string, unknown>) => ({
        id: 'config-4',
        facilityId: input.facilityId,
        version: input.version,
        effectiveAt: input.effectiveAt,
        isPending: input.isPending,
        scheduleJson: input.scheduleJson,
        slotMinutes: input.slotMinutes,
        quotaKind: input.quotaKind,
        quotaLimit: input.quotaLimit,
        advanceDays: input.advanceDays,
        createdAt: now,
      }),
    );
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx as never));

    const committed = await commitConfigChange(
      actor,
      'facility-1',
      { ...body, effectiveAt, previewToken },
      { clock, requestId: 'req-1', isSeedActor: false },
    );

    expect(clearStalePendingFlags).toHaveBeenCalledWith(tx, { facilityId: 'facility-1', at: now });
    expect(calls).toEqual(['clear', 'check']);
    expect(findPendingConfig).toHaveBeenCalledWith(tx, 'facility-1');
    expect(committed.version).toBe(4);
  });

  it('still blocks when a future pending survives the sweep', async () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const effectiveAt = new Date('2026-10-16T00:00:00.000Z');
    const clock = fakeClock(now);
    const actor = fakeActor({ isSystemAdmin: true });
    const body = proposed();
    const fingerprint = previewFingerprint({ configVersion: 3, confirmedFutureSlotIds: [] });
    const previewToken = encodePreviewToken({
      facilityId: 'facility-1',
      configVersion: 3,
      effectiveAt: effectiveAt.toISOString(),
      proposed: body,
      fingerprint,
    });
    findFacilityById.mockResolvedValue({
      id: 'facility-1',
      projectId: 'project-1',
      code: 'arena',
      name: 'Arena',
      description: null,
      status: 'ACTIVE' as const,
      capacity: 2,
    });
    findEffectiveConfig.mockResolvedValue({
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
    });
    listConfirmedFutureSlots.mockResolvedValue([]);
    listQuotaConsumingSlots.mockResolvedValue([]);
    listAdjustmentsForRoomFacility.mockResolvedValue([]);
    listClosuresOverlapping.mockResolvedValue([]);
    clearStalePendingFlags.mockResolvedValue(0);
    findPendingConfig.mockResolvedValue({
      id: 'config-pending',
      facilityId: 'facility-1',
      version: 4,
      effectiveAt: new Date('2026-10-20T00:00:00.000Z'),
      isPending: true,
      scheduleJson: schedule(),
      slotMinutes: 60,
      quotaKind: 'WEEKLY' as const,
      quotaLimit: 2,
      advanceDays: 30,
      createdAt: now,
    });
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx as never));

    await expect(
      commitConfigChange(
        actor,
        'facility-1',
        { ...body, effectiveAt, previewToken },
        { clock, requestId: 'req-1', isSeedActor: false },
      ),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(insertFacilityConfig).not.toHaveBeenCalled();
  });
});
