import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { fakeActor, fakeClock } from '@/tests/fakes';
import type { PropertyCtx } from './ctx';
import type { RoomRow } from '../infrastructure/structureRepository';
import type { TenancyRow } from '../infrastructure/tenancyRepository';
import type { MembershipRow } from '../infrastructure/membershipRepository';

const {
  findRoomByIdMock,
  updateRoomMock,
  lockPropertyScopeMock,
  listRoomDeletionBlockersMock,
  listOwnershipsByRoomMock,
  listTenanciesByRoomMock,
  listMembershipsByRoomMock,
} = vi.hoisted(() => ({
  findRoomByIdMock: vi.fn(),
  updateRoomMock: vi.fn(),
  lockPropertyScopeMock: vi.fn(),
  listRoomDeletionBlockersMock: vi.fn(),
  listOwnershipsByRoomMock: vi.fn(),
  listTenanciesByRoomMock: vi.fn(),
  listMembershipsByRoomMock: vi.fn(),
}));

vi.mock('../infrastructure/structureRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/structureRepository')>();
  return {
    ...original,
    findRoomById: findRoomByIdMock,
    updateRoom: updateRoomMock,
    lockPropertyScope: lockPropertyScopeMock,
    listRoomDeletionBlockers: listRoomDeletionBlockersMock,
  };
});

vi.mock('../infrastructure/ownershipRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/ownershipRepository')>();
  return { ...original, listOwnershipsByRoom: listOwnershipsByRoomMock };
});

vi.mock('../infrastructure/tenancyRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/tenancyRepository')>();
  return { ...original, listTenanciesByRoom: listTenanciesByRoomMock };
});

vi.mock('../infrastructure/membershipRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/membershipRepository')>();
  return { ...original, listMembershipsByRoom: listMembershipsByRoomMock };
});

vi.mock('@/shared/observability/audit', () => ({
  writeAudit: vi.fn(async () => undefined),
}));

vi.mock('@/shared/db/client', () => ({
  db: { transaction: (fn: (tx: object) => Promise<unknown>) => fn({}) },
  closeDb: vi.fn(),
}));

import { disableRoom, previewRoomImpact } from './structures';

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

function tenancyRow(overrides?: Partial<TenancyRow>): TenancyRow {
  return {
    id: 'tenancy-1',
    roomId: 'room-1',
    startsAt: new Date('2026-10-01T00:00:00.000Z'),
    endsAt: null,
    state: 'ACTIVE',
    managementMode: 'PROJECT_MANAGED',
    createdBy: 'user-admin',
    ...overrides,
  };
}

function membershipRow(overrides?: Partial<MembershipRow>): MembershipRow {
  return {
    id: 'membership-1',
    roomId: 'room-1',
    tenancyId: 'tenancy-1',
    userId: 'user-resident',
    memberRole: 'SUB',
    startAt: new Date('2026-10-01T00:00:00.000Z'),
    endAt: null,
    ...overrides,
  };
}

describe('BUG-017 room impact preview counts live intervals at the given time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRoomByIdMock.mockResolvedValue(roomRow());
    listOwnershipsByRoomMock.mockResolvedValue([]);
  });

  it('excludes scheduled future tenancies from the active count', async () => {
    listTenanciesByRoomMock.mockResolvedValue([
      tenancyRow({ id: 'tenancy-live' }),
      tenancyRow({ id: 'tenancy-future', startsAt: new Date('2026-11-01T00:00:00.000Z') }),
      tenancyRow({ id: 'tenancy-cancelled', startsAt: new Date('2026-11-01T00:00:00.000Z'), state: 'CANCELLED' }),
    ]);
    listMembershipsByRoomMock.mockResolvedValue([]);

    const preview = await previewRoomImpact('room-1', new Date('2026-10-28T00:00:00.000Z'));

    expect(preview.activeTenancies).toBe(1);
    expect(preview.tenancyIntervals).toBe(3);
  });

  it('excludes memberships that start in the future or hang on a non-live tenancy', async () => {
    listTenanciesByRoomMock.mockResolvedValue([
      tenancyRow({ id: 'tenancy-live' }),
      tenancyRow({ id: 'tenancy-future', startsAt: new Date('2026-11-01T00:00:00.000Z') }),
    ]);
    listMembershipsByRoomMock.mockResolvedValue([
      membershipRow({ id: 'member-live', tenancyId: 'tenancy-live' }),
      membershipRow({ id: 'member-direct', tenancyId: null }),
      membershipRow({
        id: 'member-future',
        tenancyId: 'tenancy-live',
        startAt: new Date('2026-11-05T00:00:00.000Z'),
      }),
      membershipRow({ id: 'member-future-tenancy', tenancyId: 'tenancy-future' }),
    ]);

    const preview = await previewRoomImpact('room-1', new Date('2026-10-28T00:00:00.000Z'));

    expect(preview.activeMemberships).toBe(2);
    expect(preview.membershipIntervals).toBe(4);
  });

  it('treats a tenancy that ends exactly now as no longer live', async () => {
    listTenanciesByRoomMock.mockResolvedValue([
      tenancyRow({ id: 'tenancy-ending', endsAt: new Date('2026-10-28T00:00:00.000Z') }),
    ]);
    listMembershipsByRoomMock.mockResolvedValue([]);

    const preview = await previewRoomImpact('room-1', new Date('2026-10-28T00:00:00.000Z'));

    expect(preview.activeTenancies).toBe(0);
  });
});

describe('BUG-025 disable honors the same blockers as delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRoomByIdMock.mockResolvedValue(roomRow());
    updateRoomMock.mockResolvedValue({ ...roomRow(), status: 'INACTIVE' });
    lockPropertyScopeMock.mockResolvedValue({ rooms: [roomRow()], floors: [], building: null });
    listOwnershipsByRoomMock.mockResolvedValue([]);
  });

  it('blocks deactivation while the shared blocker query reports the room', async () => {
    listRoomDeletionBlockersMock.mockResolvedValue(['room-1']);
    listTenanciesByRoomMock.mockResolvedValue([tenancyRow()]);
    listMembershipsByRoomMock.mockResolvedValue([membershipRow()]);

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const outcome = disableRoom(actor, 'room-1', propertyCtx());

    await expect(outcome).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(listRoomDeletionBlockersMock).toHaveBeenCalledWith(
      expect.anything(),
      ['room-1'],
      new Date('2026-10-28T00:00:00.000Z'),
    );
    expect(updateRoomMock).not.toHaveBeenCalled();
  });

  it('deactivates a clean room and returns the live impact', async () => {
    listRoomDeletionBlockersMock.mockResolvedValue([]);
    listTenanciesByRoomMock.mockResolvedValue([
      tenancyRow({ id: 'tenancy-live' }),
      tenancyRow({ id: 'tenancy-future', startsAt: new Date('2026-11-01T00:00:00.000Z') }),
    ]);
    listMembershipsByRoomMock.mockResolvedValue([
      membershipRow({ id: 'member-live', tenancyId: 'tenancy-live' }),
    ]);

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await disableRoom(actor, 'room-1', propertyCtx());

    expect(result.room.status).toBe('INACTIVE');
    expect(result.impact.activeTenancies).toBe(1);
    expect(result.impact.activeMemberships).toBe(1);
    expect(updateRoomMock).toHaveBeenCalledWith(expect.anything(), 'room-1', { status: 'INACTIVE' });
  });
});
