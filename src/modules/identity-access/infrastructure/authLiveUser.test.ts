import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/db/client', () => ({ db: {} }));
vi.mock('@/config/env', () => ({
  env: {
    APP_BASE_URL: 'http://localhost:3000',
    BETTER_AUTH_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'a-test-secret-long-enough-for-better-auth',
  },
}));

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  const { hashPassword } = await import('better-auth/crypto');
  const password = await hashPassword('LiveUserPassword42!');
  const common = {
    name: 'Reused identity',
    email: 'reused@example.invalid',
    username: 'reused.user',
    emailVerified: false,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    mustChangePassword: false,
    isSystemAdmin: false,
  };
  return {
    drizzleAdapter: () => memoryAdapter({
      user: [
        { ...common, id: 'deleted-user', accountStatus: 'SUSPENDED', deletedAt: new Date() },
        { ...common, id: 'live-user', accountStatus: 'ACTIVE', deletedAt: null },
      ],
      account: [{
        id: 'credential-account',
        accountId: 'live-user',
        userId: 'live-user',
        providerId: 'credential',
        password,
        createdAt: common.createdAt,
        updatedAt: common.updatedAt,
      }],
      session: [],
      verification: [],
    }),
  };
});

import { auth } from './betterAuth';

describe('authentication after reusing a deleted account identifier', () => {
  it.each([
    ['username', 'reused.user'],
    ['email', 'reused@example.invalid'],
  ])('resolves the live account by %s even when the deleted row comes first', async (field, value) => {
    const context = await auth.$context;
    const found = await context.adapter.findOne<{ id: string }>({
      model: 'user',
      where: [{ field, value }],
    });
    expect(found?.id).toBe('live-user');
  });

  it('does not return a deleted account by id', async () => {
    const context = await auth.$context;
    expect(await context.adapter.findOne({
      model: 'user',
      where: [{ field: 'id', value: 'deleted-user' }],
    })).toBeNull();
  });

  it('excludes deleted rows from user lists and counts', async () => {
    const context = await auth.$context;
    const users = await context.adapter.findMany<{ id: string }>({ model: 'user' });
    expect(users.map((user) => user.id)).toEqual(['live-user']);
    expect(await context.adapter.count({ model: 'user' })).toBe(1);
  });

  it('keeps credential lookups working without requiring a deletedAt column', async () => {
    const context = await auth.$context;
    const account = await context.adapter.findOne<{ id: string }>({
      model: 'account',
      where: [{ field: 'userId', value: 'live-user' }],
    });
    expect(account?.id).toBe('credential-account');
  });

  it('signs in the replacement account with its username and password', async () => {
    const result = await auth.api.signInUsername({
      body: { username: 'reused.user', password: 'LiveUserPassword42!' },
    });
    expect(result.user.id).toBe('live-user');
  });

  it('signs in the replacement account with its email and password', async () => {
    const result = await auth.api.signInEmail({
      body: { email: 'reused@example.invalid', password: 'LiveUserPassword42!' },
    });
    expect(result.user.id).toBe('live-user');
  });
});
