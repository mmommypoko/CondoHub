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

const tx = { marker: 'tx' };

function facilityRow() {
  return {
    id: 'facility-1',
    projectId: 'project-1',
    code: 'arena',
    name: 'Arena',
    description: null,
    status: 'ACTIVE' as const,
    capacity: 2,
  };
}

function configRow() {
  return {
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
}

describe('UT-FB-16 analytical capacity never persists through config commit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a commit whose analytical capacity differs from the facility', async () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const effectiveAt = new Date('2026-10-16T00:00:00.000Z');
    const body = {
      schedule: schedule(),
      slotMinutes: 60,
      capacity: 4,
      quotaKind: 'WEEKLY' as const,
      quotaLimit: 5,
      advanceDays: 30,
    };
    const fingerprint = previewFingerprint({ configVersion: 3, confirmedFutureSlotIds: [] });
    const previewToken = encodePreviewToken({
      facilityId: 'facility-1',
      configVersion: 3,
      effectiveAt: effectiveAt.toISOString(),
      proposed: body,
      fingerprint,
    });
    findFacilityById.mockResolvedValue(facilityRow());
    findEffectiveConfig.mockResolvedValue(configRow());
    listConfirmedFutureSlots.mockResolvedValue([]);
    listQuotaConsumingSlots.mockResolvedValue([]);
    listAdjustmentsForRoomFacility.mockResolvedValue([]);
    listClosuresOverlapping.mockResolvedValue([]);
    clearStalePendingFlags.mockResolvedValue(0);
    findPendingConfig.mockResolvedValue(null);
    maxConfigVersion.mockResolvedValue(3);
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx as never));

    await expect(
      commitConfigChange(
        fakeActor({ isSystemAdmin: true }),
        'facility-1',
        { ...body, effectiveAt, previewToken },
        { clock: fakeClock(now), requestId: 'req-1', isSeedActor: false },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(insertFacilityConfig).not.toHaveBeenCalled();
  });

  it('persists config rows without a capacity column and echoes the analytical value', async () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const effectiveAt = new Date('2026-10-16T00:00:00.000Z');
    const body = {
      schedule: schedule(),
      slotMinutes: 60,
      capacity: 2,
      quotaKind: 'WEEKLY' as const,
      quotaLimit: 5,
      advanceDays: 30,
    };
    const fingerprint = previewFingerprint({ configVersion: 3, confirmedFutureSlotIds: [] });
    const previewToken = encodePreviewToken({
      facilityId: 'facility-1',
      configVersion: 3,
      effectiveAt: effectiveAt.toISOString(),
      proposed: body,
      fingerprint,
    });
    findFacilityById.mockResolvedValue(facilityRow());
    findEffectiveConfig.mockResolvedValue(configRow());
    listConfirmedFutureSlots.mockResolvedValue([]);
    listQuotaConsumingSlots.mockResolvedValue([]);
    listAdjustmentsForRoomFacility.mockResolvedValue([]);
    listClosuresOverlapping.mockResolvedValue([]);
    clearStalePendingFlags.mockResolvedValue(0);
    findPendingConfig.mockResolvedValue(null);
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
      fakeActor({ isSystemAdmin: true }),
      'facility-1',
      { ...body, effectiveAt, previewToken },
      { clock: fakeClock(now), requestId: 'req-1', isSeedActor: false },
    );

    expect(insertFacilityConfig).toHaveBeenCalledTimes(1);
    const stored = vi.mocked(insertFacilityConfig).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(stored).not.toHaveProperty('capacity');
    expect(writeAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'facility.config.committed',
        after: expect.objectContaining({ analyticalCapacity: 2, effectiveCapacity: 2 }),
      }),
    );
    expect(committed.proposed.capacity).toBe(2);
  });
});
