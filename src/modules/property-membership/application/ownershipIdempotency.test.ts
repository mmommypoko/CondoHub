import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { fakeActor, fakeClock, fakeUuid } from '@/tests/fakes';
import type { PropertyCtx } from './ctx';
import type { OwnershipRow } from '../infrastructure/ownershipRepository';
import type { UserLookupResult } from '@/modules/identity-access/application/userLookups';
import type { RoomRow } from '../infrastructure/structureRepository';

const {
  findRoomByIdMock,
  findOwnershipByIdMock,
  listOwnershipsByRoomMock,
  endOwnershipMock,
  insertOwnershipMock,
  lookupUserByIdMock,
  getIdempotencyRecordMock,
  upsertIdempotencyRecordMock,
} = vi.hoisted(() => ({
  findRoomByIdMock: vi.fn(),
  findOwnershipByIdMock: vi.fn(),
  listOwnershipsByRoomMock: vi.fn(),
  endOwnershipMock: vi.fn(),
  insertOwnershipMock: vi.fn(),
  lookupUserByIdMock: vi.fn(),
  getIdempotencyRecordMock: vi.fn(),
  upsertIdempotencyRecordMock: vi.fn(),
}));

vi.mock('../infrastructure/structureRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/structureRepository')>();
  return { ...original, findRoomById: findRoomByIdMock };
});

vi.mock('../infrastructure/ownershipRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/ownershipRepository')>();
  return {
    ...original,
    findOwnershipById: findOwnershipByIdMock,
    listOwnershipsByRoom: listOwnershipsByRoomMock,
    endOwnership: endOwnershipMock,
    insertOwnership: insertOwnershipMock,
  };
});

vi.mock('@/modules/identity-access/application/index', () => ({
  lookupUserById: (...args: unknown[]) => lookupUserByIdMock(...args),
  createIdentityCtx: vi.fn(() => ({})),
  resolveOrCreateGrantUser: vi.fn(),
}));

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

import { hashRequestBody } from '@/shared/utils/idempotency';
import { removeOwnership, transferOwnership } from './ownershipAdmin';

function propertyCtx(): PropertyCtx {
  return { clock: fakeClock('2026-10-28T00:00:00.000Z'), requestId: 'req-1', isSeedActor: false };
}

function roomRow(): RoomRow {
  return {
    id: 'room-1',
    floorId: 'floor-1',
    buildingId: 'building-1',
    roomCode: '101',
    name: 'Room 101',
    areaSqm: '42.50',
    status: 'ACTIVE',
  };
}

function ownershipRow(overrides?: Partial<OwnershipRow>): OwnershipRow {
  return {
    id: fakeUuid(),
    roomId: 'room-1',
    userId: 'user-from',
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: null,
    grantedBy: 'user-admin',
    ...overrides,
  };
}

function activeUser(id: string): UserLookupResult {
  return { id, accountStatus: 'ACTIVE', deletedAt: null };
}

describe('BUG-011 ownership transfer and remove honor Idempotency-Key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRoomByIdMock.mockResolvedValue(roomRow());
    getIdempotencyRecordMock.mockResolvedValue(null);
    lookupUserByIdMock.mockImplementation(async (_conn: unknown, userId: string) =>
      activeUser(userId),
    );
  });

  it('replays a transfer from the stored record without writing a second interval', async () => {
    const effectiveAt = new Date('2026-10-28T00:00:00.000Z');
    const ended = ownershipRow({ id: 'own-ended', userId: 'user-from', endAt: effectiveAt });
    const created = ownershipRow({ id: 'own-created', userId: 'user-to', startAt: effectiveAt });
    listOwnershipsByRoomMock.mockResolvedValue([ended, created]);
    getIdempotencyRecordMock.mockResolvedValue({
      scope: 'OWNER_TRANSFER',
      key: 'key-1',
      actorId: 'user-admin',
      requestHash: hashRequestBody({
        roomId: 'room-1',
        fromUserId: 'user-from',
        toUserId: 'user-to',
        effectiveAt: effectiveAt.toISOString(),
      }),
      resultRefType: 'room_ownership',
      resultRefId: 'own-created',
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await transferOwnership(
      actor,
      { roomId: 'room-1', fromUserId: 'user-from', toUserId: 'user-to', effectiveAt, idempotencyKey: 'key-1' },
      propertyCtx(),
    );

    expect(result).toEqual({
      endedOwnershipId: 'own-ended',
      createdOwnershipId: 'own-created',
      effectiveAt,
      replayed: true,
    });
    expect(endOwnershipMock).not.toHaveBeenCalled();
    expect(insertOwnershipMock).not.toHaveBeenCalled();
  });

  it('stores the first transfer under the key with the request hash', async () => {
    const effectiveAt = new Date('2026-10-28T00:00:00.000Z');
    const source = ownershipRow({ id: 'own-source', userId: 'user-from' });
    const created = ownershipRow({ id: 'own-created', userId: 'user-to', startAt: effectiveAt });
    listOwnershipsByRoomMock.mockResolvedValue([source]);
    endOwnershipMock.mockResolvedValue({ ...source, endAt: effectiveAt });
    insertOwnershipMock.mockResolvedValue(created);

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await transferOwnership(
      actor,
      { roomId: 'room-1', fromUserId: 'user-from', toUserId: 'user-to', effectiveAt, idempotencyKey: 'key-1' },
      propertyCtx(),
    );

    expect(result.replayed).toBe(false);
    expect(upsertIdempotencyRecordMock).toHaveBeenCalledTimes(1);
    const stored = upsertIdempotencyRecordMock.mock.calls[0]?.[1] as {
      scope: string;
      key: string;
      resultRefId: string;
    };
    expect(stored).toMatchObject({ scope: 'OWNER_TRANSFER', key: 'key-1', resultRefId: 'own-created' });
  });

  it('replays a remove from the stored record without ending the interval twice', async () => {
    const effectiveAt = new Date('2026-10-28T00:00:00.000Z');
    findOwnershipByIdMock.mockResolvedValue(ownershipRow({ id: 'own-1' }));
    getIdempotencyRecordMock.mockResolvedValue({
      scope: 'OWNER_REMOVE',
      key: 'key-1',
      actorId: 'user-admin',
      requestHash: hashRequestBody({
        roomId: 'room-1',
        ownershipId: 'own-1',
        effectiveAt: effectiveAt.toISOString(),
      }),
      resultRefType: 'room_ownership',
      resultRefId: 'own-1',
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await removeOwnership(
      actor,
      { roomId: 'room-1', ownershipId: 'own-1', effectiveAt, idempotencyKey: 'key-1' },
      propertyCtx(),
    );

    expect(result).toEqual({ ownershipId: 'own-1', effectiveAt, replayed: true });
    expect(endOwnershipMock).not.toHaveBeenCalled();
  });

  it('rejects a reused transfer key carrying a different request', async () => {
    listOwnershipsByRoomMock.mockResolvedValue([ownershipRow({ userId: 'user-from' })]);
    getIdempotencyRecordMock.mockResolvedValue({
      scope: 'OWNER_TRANSFER',
      key: 'key-1',
      actorId: 'user-admin',
      requestHash: 'stale-hash',
      resultRefType: 'room_ownership',
      resultRefId: 'own-other',
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const outcome = transferOwnership(
      actor,
      {
        roomId: 'room-1',
        fromUserId: 'user-from',
        toUserId: 'user-to',
        effectiveAt: new Date('2026-10-28T00:00:00.000Z'),
        idempotencyKey: 'key-1',
      },
      propertyCtx(),
    );

    await expect(outcome).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(endOwnershipMock).not.toHaveBeenCalled();
  });
});
