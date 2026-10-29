import { beforeEach, describe, expect, it, vi } from 'vitest';

const findBookingById = vi.fn();
const lockBookingSlotForUpdate = vi.fn();
const updateBookingSlotState = vi.fn();
const findEffectiveConfig = vi.fn();
const ensureQuotaPeriodLocks = vi.fn();
const insertRefundCredit = vi.fn();
const listSlotsForBooking = vi.fn();
const canActInRoom = vi.fn();
const writeAudit = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/shared/db/client', () => ({ db: { transaction: vi.fn() } }));

vi.mock('../infrastructure/facilityRepository', () => ({
  findBookingById: (...args: unknown[]) => findBookingById(...args),
  lockBookingSlotForUpdate: (...args: unknown[]) => lockBookingSlotForUpdate(...args),
  updateBookingSlotState: (...args: unknown[]) => updateBookingSlotState(...args),
  findEffectiveConfig: (...args: unknown[]) => findEffectiveConfig(...args),
  ensureQuotaPeriodLocks: (...args: unknown[]) => ensureQuotaPeriodLocks(...args),
  insertRefundCredit: (...args: unknown[]) => insertRefundCredit(...args),
  listSlotsForBooking: (...args: unknown[]) => listSlotsForBooking(...args),
}));

vi.mock('@/modules/property-membership/application/index', () => ({
  canActInRoom: (...args: unknown[]) => canActInRoom(...args),
}));

vi.mock('@/shared/observability/audit', () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

import { db } from '@/shared/db/client';
import { fakeActor, fakeClock } from '@/tests/fakes';
import { cancelBookingSlot } from './bookings';

const tx = { marker: 'tx' };

describe('UT-FB-31 cancel reason is stored on every cancel path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores the resident reason even when no quota is refunded', async () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const slot = {
      id: 'slot-1',
      bookingId: 'booking-1',
      facilityId: 'facility-1',
      roomId: 'room-1',
      startsAt: new Date('2026-10-16T02:00:00.000Z'),
      endsAt: new Date('2026-10-16T03:00:00.000Z'),
      state: 'CONFIRMED' as const,
      canceledBy: null,
      refundQuota: false,
      cancelReason: null,
    };
    canActInRoom.mockResolvedValue({ allowed: true });
    findBookingById.mockResolvedValue({
      id: 'booking-1',
      roomId: 'room-1',
      facilityId: 'facility-1',
      createdBy: null,
      createdAt: now,
    });
    lockBookingSlotForUpdate.mockResolvedValue(slot);
    updateBookingSlotState.mockImplementation(async (_conn: unknown, input: { cancelReason: string }) => ({
      ...slot,
      state: 'RESIDENT_CANCELLED' as const,
      canceledBy: 'user-1',
      refundQuota: false,
      cancelReason: input.cancelReason,
    }));
    listSlotsForBooking.mockImplementation(async () => [
      {
        ...slot,
        state: 'RESIDENT_CANCELLED' as const,
        canceledBy: 'user-1',
        refundQuota: false,
        cancelReason: 'Plans changed',
      },
    ]);
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx as never));

    await cancelBookingSlot(
      fakeActor({ userId: 'user-1' }),
      { bookingId: 'booking-1', slotId: 'slot-1', reason: 'Plans changed' },
      { clock: fakeClock(now), requestId: 'req-1', isSeedActor: false },
    );

    expect(updateBookingSlotState).toHaveBeenCalledWith(tx, {
      slotId: 'slot-1',
      expectedState: 'CONFIRMED',
      nextState: 'RESIDENT_CANCELLED',
      canceledBy: 'user-1',
      refundQuota: false,
      cancelReason: 'Plans changed',
    });
    expect(insertRefundCredit).not.toHaveBeenCalled();
  });

  it('stores the admin reason on both refund and non-refund paths', async () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const slot = {
      id: 'slot-2',
      bookingId: 'booking-2',
      facilityId: 'facility-1',
      roomId: 'room-1',
      startsAt: new Date('2026-10-16T02:00:00.000Z'),
      endsAt: new Date('2026-10-16T03:00:00.000Z'),
      state: 'CONFIRMED' as const,
      canceledBy: null,
      refundQuota: false,
      cancelReason: null,
    };
    findBookingById.mockResolvedValue({
      id: 'booking-2',
      roomId: 'room-1',
      facilityId: 'facility-1',
      createdBy: null,
      createdAt: now,
    });
    lockBookingSlotForUpdate.mockResolvedValue(slot);
    updateBookingSlotState.mockImplementation(
      async (_conn: unknown, input: { cancelReason: string; refundQuota: boolean }) => ({
        ...slot,
        state: 'ADMIN_CANCELLED' as const,
        canceledBy: 'admin-1',
        refundQuota: input.refundQuota,
        cancelReason: input.cancelReason,
      }),
    );
    listSlotsForBooking.mockImplementation(async () => [slot]);
    findEffectiveConfig.mockResolvedValue({
      id: 'config-1',
      facilityId: 'facility-1',
      version: 1,
      effectiveAt: new Date('2026-10-01T00:00:00.000Z'),
      isPending: false,
      scheduleJson: {},
      slotMinutes: 60,
      quotaKind: 'WEEKLY' as const,
      quotaLimit: 5,
      advanceDays: 30,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx as never));

    await cancelBookingSlot(
      fakeActor({ userId: 'admin-1', isSystemAdmin: true }),
      { bookingId: 'booking-2', slotId: 'slot-2', reason: 'Maintenance', refundQuota: false },
      { clock: fakeClock(now), requestId: 'req-1', isSeedActor: false },
    );
    expect(updateBookingSlotState).toHaveBeenCalledWith(tx, {
      slotId: 'slot-2',
      expectedState: 'CONFIRMED',
      nextState: 'ADMIN_CANCELLED',
      canceledBy: 'admin-1',
      refundQuota: false,
      cancelReason: 'Maintenance',
    });

    vi.clearAllMocks();
    findBookingById.mockResolvedValue({
      id: 'booking-2',
      roomId: 'room-1',
      facilityId: 'facility-1',
      createdBy: null,
      createdAt: now,
    });
    lockBookingSlotForUpdate.mockResolvedValue(slot);
    updateBookingSlotState.mockResolvedValue({ ...slot, state: 'ADMIN_CANCELLED' as const });
    listSlotsForBooking.mockImplementation(async () => [slot]);
    findEffectiveConfig.mockResolvedValue({
      id: 'config-1',
      facilityId: 'facility-1',
      version: 1,
      effectiveAt: new Date('2026-10-01T00:00:00.000Z'),
      isPending: false,
      scheduleJson: {},
      slotMinutes: 60,
      quotaKind: 'WEEKLY' as const,
      quotaLimit: 5,
      advanceDays: 30,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx as never));

    await cancelBookingSlot(
      fakeActor({ userId: 'admin-1', isSystemAdmin: true }),
      { bookingId: 'booking-2', slotId: 'slot-2', reason: 'Goodwill refund', refundQuota: true },
      { clock: fakeClock(now), requestId: 'req-2', isSeedActor: false },
    );
    expect(updateBookingSlotState).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ cancelReason: 'Goodwill refund', refundQuota: true }),
    );
    expect(insertRefundCredit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ bookingSlotId: 'slot-2', reason: 'Goodwill refund' }),
    );
  });
});
