import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { fakeActor, fakeClock } from '@/tests/fakes';
import type { IdentityCtx } from './ctx';
import type { ProvisionIdempotencyRecord } from './provisionIdempotencyStore';
import type { UserRow } from '../infrastructure/userRepository';

const {
  resolveOrCreateGrantUserMock,
  getProvisionIdempotencyRecordMock,
  upsertProvisionIdempotencyRecordMock,
  findUserByUsernameMock,
  findUserByEmailMock,
} = vi.hoisted(() => ({
  resolveOrCreateGrantUserMock: vi.fn(),
  getProvisionIdempotencyRecordMock: vi.fn(),
  upsertProvisionIdempotencyRecordMock: vi.fn(),
  findUserByUsernameMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
}));

vi.mock('./provisioning', () => ({
  resolveOrCreateGrantUser: resolveOrCreateGrantUserMock,
}));

vi.mock('./provisionIdempotencyStore', async (importOriginal) => {
  const original = await importOriginal<typeof import('./provisionIdempotencyStore')>();
  return {
    ...original,
    getProvisionIdempotencyRecord: getProvisionIdempotencyRecordMock,
    upsertProvisionIdempotencyRecord: upsertProvisionIdempotencyRecordMock,
  };
});

vi.mock('../infrastructure/userRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/userRepository')>();
  return {
    ...original,
    findUserByUsername: findUserByUsernameMock,
    findUserByEmail: findUserByEmailMock,
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
import { provisionUser } from './provisionUser';

function identityCtx(): IdentityCtx {
  return {
    clock: fakeClock('2026-10-28T00:00:00.000Z'),
    requestId: 'req-1',
    isSeedActor: false,
    tempPasswords: { generate: () => 'TempPassWord42' },
  };
}

function userRow(): UserRow {
  return {
    id: 'user-target',
    name: 'Target User',
    email: 'target@example.invalid',
    username: 'target.user',
    phone: null,
    accountStatus: 'ACTIVE',
    mustChangePassword: true,
    isSystemAdmin: false,
    createdAt: new Date('2026-10-28T00:00:00.000Z'),
    deletedAt: null,
  };
}

function storedRecord(requestHash: string): ProvisionIdempotencyRecord {
  return {
    scope: 'USER_PROVISION',
    key: 'key-1',
    actorId: 'user-admin',
    requestHash,
    resultRefType: 'user',
    resultRefId: null,
  };
}

function provisionInput() {
  return {
    roomId: 'room-1',
    username: 'target.user',
    email: 'target@example.invalid',
    name: 'Target User',
    targetRole: 'TENANT' as const,
    idempotencyKey: 'key-1',
  };
}

function provisionDeps() {
  return {
    entitlements: {
      resolve: async () => ({
        roomId: 'room-1',
        managementMode: 'PROJECT_MANAGED' as const,
        isCurrentOwner: false,
        isTopTenantManager: false,
      }),
    },
    memberships: { attach: async () => ({ membershipId: 'membership-1' }) },
  };
}

describe('BUG-008 room provision honors Idempotency-Key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProvisionIdempotencyRecordMock.mockResolvedValue(null);
  });

  it('replays a provisioned user without creating or attaching twice', async () => {
    const input = provisionInput();
    getProvisionIdempotencyRecordMock.mockResolvedValue(
      storedRecord(
        hashRequestBody({
          roomId: input.roomId,
          username: input.username,
          email: input.email,
          name: input.name,
          phone: null,
          targetRole: input.targetRole,
        }),
      ),
    );
    findUserByUsernameMock.mockResolvedValue(userRow());

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await provisionUser(actor, input, identityCtx(), provisionDeps());

    expect(result).toEqual({ created: false, userId: 'user-target' });
    expect(resolveOrCreateGrantUserMock).not.toHaveBeenCalled();
    expect(upsertProvisionIdempotencyRecordMock).not.toHaveBeenCalled();
  });

  it('replays by email when the replay carries no username', async () => {
    const input = { ...provisionInput(), username: undefined };
    getProvisionIdempotencyRecordMock.mockResolvedValue(
      storedRecord(
        hashRequestBody({
          roomId: input.roomId,
          username: null,
          email: input.email,
          name: input.name,
          phone: null,
          targetRole: input.targetRole,
        }),
      ),
    );
    findUserByEmailMock.mockResolvedValue(userRow());

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await provisionUser(actor, input, identityCtx(), provisionDeps());

    expect(result).toEqual({ created: false, userId: 'user-target' });
    expect(findUserByUsernameMock).not.toHaveBeenCalled();
    expect(resolveOrCreateGrantUserMock).not.toHaveBeenCalled();
  });

  it('stores the first provision under the key and keeps no-key behavior unchanged', async () => {
    resolveOrCreateGrantUserMock.mockResolvedValue({
      created: true,
      userId: 'user-target',
      tempPassword: 'TempPassWord42',
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const keyed = await provisionUser(actor, provisionInput(), identityCtx(), provisionDeps());
    const { idempotencyKey: _ignored, ...plainInput } = provisionInput();
    const plain = await provisionUser(actor, plainInput, identityCtx(), provisionDeps());

    expect(keyed).toEqual({ created: true, userId: 'user-target', tempPassword: 'TempPassWord42' });
    expect(plain).toEqual({ created: true, userId: 'user-target', tempPassword: 'TempPassWord42' });
    expect(upsertProvisionIdempotencyRecordMock).toHaveBeenCalledTimes(1);
    const stored = upsertProvisionIdempotencyRecordMock.mock.calls[0]?.[1] as {
      scope: string;
      key: string;
      resultRefType: string;
      resultRefId: null;
    };
    expect(stored).toMatchObject({
      scope: 'USER_PROVISION',
      key: 'key-1',
      resultRefType: 'user',
      resultRefId: null,
    });
  });

  it('rejects a reused key carrying a different provision request', async () => {
    getProvisionIdempotencyRecordMock.mockResolvedValue(storedRecord('stale-hash'));

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const outcome = provisionUser(actor, provisionInput(), identityCtx(), provisionDeps());

    await expect(outcome).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(resolveOrCreateGrantUserMock).not.toHaveBeenCalled();
  });
});
