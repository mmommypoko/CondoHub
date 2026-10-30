import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { fakeActor, fakeClock } from '@/tests/fakes';
import type { BillingCtx } from './ctx';

const {
  findInvoicePayeeMock,
  findReviewByRoomMonthMock,
  insertInvoiceIdempotentMock,
} = vi.hoisted(() => ({
  findInvoicePayeeMock: vi.fn(),
  findReviewByRoomMonthMock: vi.fn(),
  insertInvoiceIdempotentMock: vi.fn(),
}));

vi.mock('../infrastructure/payeeRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/payeeRepository')>();
  return { ...original, findInvoicePayee: findInvoicePayeeMock };
});

vi.mock('../infrastructure/turnoverReviewRepository', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../infrastructure/turnoverReviewRepository')>();
  return { ...original, findReviewByRoomMonth: findReviewByRoomMonthMock };
});

vi.mock('../infrastructure/billingRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/billingRepository')>();
  return {
    ...original,
    insertInvoiceIdempotent: insertInvoiceIdempotentMock,
    insertRentInvoiceReviewers: vi.fn(async () => undefined),
  };
});

vi.mock('@/modules/property-membership/application/index', () => ({
  getOwnersAt: vi.fn(async () => []),
  lockTenancyForBilling: vi.fn(async () => true),
  getRentalPeriods: vi.fn(async () => []),
  resolveActorRooms: vi.fn(async () => []),
}));

vi.mock('@/shared/observability/audit', () => ({
  writeAudit: vi.fn(async () => undefined),
}));

vi.mock('@/shared/db/client', () => ({
  db: { transaction: (fn: (tx: object) => Promise<unknown>) => fn({}) },
  closeDb: vi.fn(),
}));

import { generateInvoicesForCycle } from './generateInvoices';

function billingCtx(): BillingCtx {
  return { clock: fakeClock('2026-10-28T00:00:00.000Z'), requestId: 'req-1', isSeedActor: false };
}

describe('BUG-001 rooms without a receiving account block with a cycle error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findReviewByRoomMonthMock.mockResolvedValue(null);
    insertInvoiceIdempotentMock.mockRejectedValue(new Error('must not insert without a payee'));
  });

  it('records a Payment-settings cycle error and issues nothing when no payee exists', async () => {
    findInvoicePayeeMock.mockResolvedValue(null);

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const counts = await generateInvoicesForCycle(actor, '2026-10', billingCtx(), {
      rooms: [{ id: 'room-1', areaSqm: '42.50', status: 'ACTIVE' }],
      rules: [
        {
          id: 'rule-1',
          kind: 'PRIVATE_RENT',
          roomId: null,
          configMode: 'PER_ROOM',
          rate: '12000.00',
          frequency: 'MONTHLY',
          effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
          enabled: true,
        },
      ],
      getOwners: async () => [],
      getTenancies: async () => [
        {
          id: 'tenancy-1',
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: null,
          managementMode: 'PRIVATE_OWNER_MANAGED',
        },
      ],
    });

    expect(counts.created).toBe(0);
    expect(counts.cycleErrors).toHaveLength(1);
    expect(counts.cycleErrors[0]).toMatchObject({
      roomId: 'room-1',
      cycle: '2026-10',
    });
    expect(counts.cycleErrors[0]?.reason).toContain('Payment settings');
    expect(insertInvoiceIdempotentMock).not.toHaveBeenCalled();
  });

  it('issues normally once a payee instruction exists', async () => {
    findInvoicePayeeMock.mockResolvedValue({
      id: 'payee-1',
      payeeType: 'OWNER',
      payeeId: 'room-1',
      bankName: 'Example Bank',
      accountName: 'Example Owner',
      accountNumber: '1234567890',
      qrImageId: null,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    });
    insertInvoiceIdempotentMock.mockResolvedValue({ id: 'invoice-1', inserted: true });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const counts = await generateInvoicesForCycle(actor, '2026-10', billingCtx(), {
      rooms: [{ id: 'room-1', areaSqm: '42.50', status: 'ACTIVE' }],
      rules: [
        {
          id: 'rule-1',
          kind: 'PRIVATE_RENT',
          roomId: null,
          configMode: 'PER_ROOM',
          rate: '12000.00',
          frequency: 'MONTHLY',
          effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
          enabled: true,
        },
      ],
      getOwners: async () => [{ userId: 'user-owner', ownershipId: 'own-1' }],
      getTenancies: async () => [
        {
          id: 'tenancy-1',
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: null,
          managementMode: 'PRIVATE_OWNER_MANAGED',
        },
      ],
    });

    expect(counts.created).toBe(1);
    expect(counts.cycleErrors).toHaveLength(0);
    expect(insertInvoiceIdempotentMock).toHaveBeenCalledTimes(1);
  });
});
