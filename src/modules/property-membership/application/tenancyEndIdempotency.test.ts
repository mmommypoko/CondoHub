import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { fakeActor, fakeClock } from '@/tests/fakes';
import type { PropertyCtx } from './ctx';
import type { IdempotencyRecord } from './idempotencyStore';
import type { TenancyRow } from '../infrastructure/tenancyRepository';

const {
  findTenancyByIdMock,
  listOwnershipsByRoomMock,
  lockTenancyByIdMock,
  endTenancyMock,
  listMembershipsByTenancyMock,
  endMembershipMock,
  cancelTenancyMock,
  getIdempotencyRecordMock,
  upsertIdempotencyRecordMock,
} = vi.hoisted(() => ({
  findTenancyByIdMock: vi.fn(),
  listOwnershipsByRoomMock: vi.fn(),
  lockTenancyByIdMock: vi.fn(),
  endTenancyMock: vi.fn(),
  listMembershipsByTenancyMock: vi.fn(),
  endMembershipMock: vi.fn(),
  cancelTenancyMock: vi.fn(),
  getIdempotencyRecordMock: vi.fn(),
  upsertIdempotencyRecordMock: vi.fn(),
}));

vi.mock('../infrastructure/tenancyRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/tenancyRepository')>();
  return {
    ...original,
    findTenancyById: findTenancyByIdMock,
    lockTenancyById: lockTenancyByIdMock,
    endTenancy: endTenancyMock,
    cancelTenancy: cancelTenancyMock,
  };
});

vi.mock('../infrastructure/ownershipRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/ownershipRepository')>();
  return { ...original, listOwnershipsByRoom: listOwnershipsByRoomMock };
});

vi.mock('../infrastructure/membershipRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/membershipRepository')>();
  return {
    ...original,
    listMembershipsByTenancy: listMembershipsByTenancyMock,
    endMembership: endMembershipMock,
  };
});

vi.mock('./idempotencyStore', async (importOriginal) => {
  const original = await importOriginal<typeof import('./idempotencyStore')>();
  return {
    ...original,
    getIdempotencyRecord: getIdempotencyRecordMock,
    upsertIdempotencyRecord: upsertIdempotencyRecordMock,
  };
});

vi.mock('@/shared/observability/audit', () => ({
  writeAudit: vi.fn(async () => undefined),
}));

vi.mock('@/shared/db/client', () => ({
  db: { transaction: (fn: (tx: object) => Promise<unknown>) => fn({}) },
  closeDb: vi.fn(),
}));

import { cancelScheduledTenancy, endTenancyAt } from './tenancies';

function propertyCtx(): PropertyCtx {
  return { clock: fakeClock('2026-10-28T00:00:00.000Z'), requestId: 'req-1', isSeedActor: false };
}

function activeTenancy(): TenancyRow {
  return {
    id: 'tenancy-1',
    roomId: 'room-1',
    startsAt: new Date('2026-10-01T00:00:00.000Z'),
    endsAt: null,
    state: 'ACTIVE',
    managementMode: 'PROJECT_MANAGED',
    createdBy: 'user-admin',
  };
}

function storedRecord(overrides?: Partial<IdempotencyRecord>): IdempotencyRecord {
  return {
    scope: 'TENANCY_END',
    key: 'key-1',
    actorId: 'user-admin',
    requestHash: 'hash-1',
    resultRefType: 'rental_period',
    resultRefId: 'tenancy-1',
    ...overrides,
  };
}

describe('BUG-012 tenancy end and cancel honor Idempotency-Key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIdempotencyRecordMock.mockResolvedValue(null);
    listOwnershipsByRoomMock.mockResolvedValue([]);
  });

  it('replays an ended tenancy without writing a second end', async () => {
    const record = storedRecord({ requestHash: 'replay-hash' });
    const ended = { ...activeTenancy(), state: 'ENDED' as const };
    findTenancyByIdMock.mockResolvedValueOnce(activeTenancy()).mockResolvedValueOnce(ended);
    getIdempotencyRecordMock.mockResolvedValueOnce(record);
    const { hashRequestBody } = await import('@/shared/utils/idempotency');
    record.requestHash = hashRequestBody({
      action: 'END',
      tenancyId: 'tenancy-1',
      endsAt: null,
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await endTenancyAt(
      actor,
      { tenancyId: 'tenancy-1', idempotencyKey: 'key-1' },
      propertyCtx(),
    );

    expect(result).toMatchObject({ id: 'tenancy-1', state: 'ENDED', replayed: true });
    expect(endTenancyMock).not.toHaveBeenCalled();
    expect(upsertIdempotencyRecordMock).not.toHaveBeenCalled();
  });

  it('rejects a reused key carrying a different end request', async () => {
    findTenancyByIdMock.mockResolvedValue(activeTenancy());
    getIdempotencyRecordMock.mockResolvedValue(storedRecord({ requestHash: 'other-hash' }));

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const outcome = endTenancyAt(
      actor,
      { tenancyId: 'tenancy-1', idempotencyKey: 'key-1' },
      propertyCtx(),
    );

    await expect(outcome).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('stores the first end under the key and keeps the no-key path unchanged', async () => {
    const ended = { ...activeTenancy(), state: 'ENDED' as const };
    findTenancyByIdMock.mockResolvedValue(activeTenancy());
    lockTenancyByIdMock.mockResolvedValue(activeTenancy());
    endTenancyMock.mockResolvedValue(ended);
    listMembershipsByTenancyMock.mockResolvedValue([]);

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const keyed = await endTenancyAt(
      actor,
      { tenancyId: 'tenancy-1', idempotencyKey: 'key-1' },
      propertyCtx(),
    );
    const plain = await endTenancyAt(actor, { tenancyId: 'tenancy-1' }, propertyCtx());

    expect(keyed).toMatchObject({ state: 'ENDED', replayed: false });
    expect(plain).toMatchObject({ state: 'ENDED' });
    expect('replayed' in plain && (plain as { replayed?: boolean }).replayed).toBe(false);
    expect(upsertIdempotencyRecordMock).toHaveBeenCalledTimes(1);
    const stored = upsertIdempotencyRecordMock.mock.calls[0]?.[1] as { scope: string };
    expect(stored.scope).toBe('TENANCY_END');
  });

  it('replays a cancelled rental without writing a second cancel', async () => {
    const { hashRequestBody } = await import('@/shared/utils/idempotency');
    const record = storedRecord({
      requestHash: hashRequestBody({ action: 'CANCEL', tenancyId: 'tenancy-1' }),
    });
    getIdempotencyRecordMock.mockResolvedValueOnce(record);
    findTenancyByIdMock.mockResolvedValueOnce({
      ...activeTenancy(),
      state: 'CANCELLED',
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await cancelScheduledTenancy(actor, 'tenancy-1', propertyCtx(), {
      idempotencyKey: 'key-1',
    });

    expect(result).toMatchObject({ id: 'tenancy-1', state: 'CANCELLED', replayed: true });
    expect(cancelTenancyMock).not.toHaveBeenCalled();
  });

  it('lets an END request and a CANCEL request share no replay even on one key', async () => {
    const { hashRequestBody } = await import('@/shared/utils/idempotency');
    getIdempotencyRecordMock.mockResolvedValue(
      storedRecord({ requestHash: hashRequestBody({ action: 'CANCEL', tenancyId: 'tenancy-1' }) }),
    );
    findTenancyByIdMock.mockResolvedValue(activeTenancy());

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const outcome = endTenancyAt(
      actor,
      { tenancyId: 'tenancy-1', idempotencyKey: 'key-1' },
      propertyCtx(),
    );

    await expect(outcome).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
