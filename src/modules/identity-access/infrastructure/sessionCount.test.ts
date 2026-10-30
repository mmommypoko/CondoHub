import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pg-proxy';
import type { Db } from '@/shared/db/transaction';
import { countActiveSessions } from './userRepository';

vi.mock('server-only', () => ({}));

interface SessionFixture {
  id: string;
  userId: string;
  expiresAt: string;
}

function sessionFixture(overrides: Partial<SessionFixture> & { id: string }): SessionFixture {
  return { userId: 'user-1', expiresAt: '2026-12-01T00:00:00.000Z', ...overrides };
}

function createSessionDb(fixtures: SessionFixture[]): {
  db: Db;
  queries: Array<{ sql: string; params: unknown[] }>;
} {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const proxy = drizzle(async (sql: string, params: unknown[]) => {
    queries.push({ sql, params: [...params] });
    const userId = params[0];
    const now = params.length > 1 ? (params[1] as Date | string) : null;
    const nowMs = now === null ? Number.POSITIVE_INFINITY : new Date(now).getTime();
    const live = fixtures.filter(
      (row) => row.userId === userId && new Date(row.expiresAt).getTime() > nowMs,
    );
    return { rows: [[live.length]] };
  });
  return { db: proxy as unknown as Db, queries };
}

describe('BUG-040 active session count honors expiry', () => {
  it('counts only sessions expiring after now for the given user', async () => {
    const { db, queries } = createSessionDb([
      sessionFixture({ id: 'live-1', userId: 'user-1', expiresAt: '2026-12-01T00:00:00.000Z' }),
      sessionFixture({ id: 'live-2', userId: 'user-1', expiresAt: '2026-10-29T00:00:00.000Z' }),
      sessionFixture({ id: 'dead-1', userId: 'user-1', expiresAt: '2026-10-01T00:00:00.000Z' }),
      sessionFixture({ id: 'edge-1', userId: 'user-1', expiresAt: '2026-10-28T00:00:00.000Z' }),
      sessionFixture({ id: 'other-1', userId: 'user-2', expiresAt: '2026-12-01T00:00:00.000Z' }),
    ]);

    const count = await countActiveSessions(db, 'user-1', new Date('2026-10-28T00:00:00.000Z'));

    expect(count).toBe(2);
    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toContain('expires_at');
  });

  it('returns zero when every session expired or belongs elsewhere', async () => {
    const { db } = createSessionDb([
      sessionFixture({ id: 'dead-1', userId: 'user-1', expiresAt: '2026-10-01T00:00:00.000Z' }),
      sessionFixture({ id: 'other-1', userId: 'user-2', expiresAt: '2026-12-01T00:00:00.000Z' }),
    ]);

    const count = await countActiveSessions(db, 'user-1', new Date('2026-10-28T00:00:00.000Z'));

    expect(count).toBe(0);
  });
});
