import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { fakeActor, fakeClock } from '@/tests/fakes';
import type { IdentityCtx } from './ctx';
import type { UserRow } from '../infrastructure/userRepository';

const {
  lockCurrentLifecycleAdministratorMock,
  lockUserByIdMock,
  deleteUserSessionsMock,
  createTxInternalAdapterMock,
} = vi.hoisted(() => ({
  lockCurrentLifecycleAdministratorMock: vi.fn(),
  lockUserByIdMock: vi.fn(),
  deleteUserSessionsMock: vi.fn(),
  createTxInternalAdapterMock: vi.fn(),
}));

vi.mock('./lifecycleAuthorization', async (importOriginal) => {
  const original = await importOriginal<typeof import('./lifecycleAuthorization')>();
  return { ...original, lockCurrentLifecycleAdministrator: lockCurrentLifecycleAdministratorMock };
});

vi.mock('../infrastructure/userRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('../infrastructure/userRepository')>();
  return {
    ...original,
    lockUserById: lockUserByIdMock,
    deleteUserSessions: deleteUserSessionsMock,
  };
});

vi.mock('../infrastructure/txAdapter', () => ({
  createTxInternalAdapter: (...args: unknown[]) => createTxInternalAdapterMock(...args),
}));

vi.mock('../infrastructure/revokeFanOut', () => ({
  emitRevokeFanOut: vi.fn(),
}));

vi.mock('@/shared/observability/audit', () => ({
  writeAudit: vi.fn(async () => undefined),
}));

vi.mock('@/shared/db/client', () => ({
  db: { transaction: (fn: (tx: object) => Promise<unknown>) => fn({}) },
  closeDb: vi.fn(),
}));

import { resetPassword } from './resetPassword';
import { setAccountStatus } from './setAccountStatus';

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
    mustChangePassword: false,
    isSystemAdmin: false,
    createdAt: new Date('2026-10-28T00:00:00.000Z'),
    deletedAt: null,
  };
}

describe('BUG-018 reset locks the acting administrator like suspend does', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lockUserByIdMock.mockResolvedValue(userRow());
    deleteUserSessionsMock.mockResolvedValue(2);
    createTxInternalAdapterMock.mockResolvedValue({
      hashPassword: async () => 'hashed',
      adapter: {
        updatePassword: async () => undefined,
        updateUser: async () => undefined,
      },
    });
  });

  it('locks the acting administrator before touching the target', async () => {
    const order: string[] = [];
    lockCurrentLifecycleAdministratorMock.mockImplementation(async () => {
      order.push('admin');
    });
    lockUserByIdMock.mockImplementation(async () => {
      order.push('target');
      return userRow();
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const result = await resetPassword(actor, 'user-target', identityCtx());

    expect(result).toMatchObject({ userId: 'user-target', revokedSessions: 2 });
    expect(lockCurrentLifecycleAdministratorMock).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['admin', 'target']);
  });

  it('matches the setAccountStatus lock order exactly', async () => {
    const resetOrder: string[] = [];
    const statusOrder: string[] = [];
    lockCurrentLifecycleAdministratorMock.mockImplementation(async () => {
      resetOrder.push('admin');
      statusOrder.push('admin');
    });

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    await resetPassword(actor, 'user-target', identityCtx());
    lockCurrentLifecycleAdministratorMock.mockClear();
    await setAccountStatus(actor, 'user-target', 'SUSPENDED', identityCtx());

    expect(lockCurrentLifecycleAdministratorMock).toHaveBeenCalledTimes(1);
    expect(resetOrder).toEqual(statusOrder);
  });

  it('refuses the reset when the acting administrator fails the lock', async () => {
    lockCurrentLifecycleAdministratorMock.mockRejectedValueOnce(
      Object.assign(new Error('denied'), { code: 'ACCESS_DENIED' }),
    );

    const actor = fakeActor({ userId: 'user-admin', isSystemAdmin: true });
    const outcome = resetPassword(actor, 'user-target', identityCtx());

    await expect(outcome).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    expect(lockUserByIdMock).not.toHaveBeenCalled();
  });
});
