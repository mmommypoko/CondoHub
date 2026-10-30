import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pg-proxy';
import type { Tx } from '@/shared/db/transaction';
import { upsertIdempotencyRecord } from './idempotencyStore';

vi.mock('server-only', () => ({}));

function createStore() {
  const records = new Map<string, unknown[]>();
  const proxy = drizzle(async (sql, params) => {
    const key = `${params[0]}:${params[1]}`;
    if (sql.startsWith('insert')) {
      const existing = records.has(key);
      const writes = !existing || sql.includes('do update');
      if (writes) {
        records.set(key, [...params.slice(0, 6), '2026-10-30T00:00:00.000Z', params[6]]);
      }
      return { rows: writes && sql.includes('returning') ? [[params[1]]] : [] };
    }
    if (sql.startsWith('select')) {
      const row = records.get(key);
      return { rows: row === undefined ? [] : [row] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  });
  return { tx: proxy as unknown as Tx, records };
}

const first = {
  scope: 'OWNER_TRANSFER' as const,
  key: '00000000-0000-4000-8000-000000000001',
  actorId: 'admin',
  requestHash: 'first-request',
  resultRefType: 'user',
  resultRefId: '00000000-0000-4000-8000-000000000002',
  expiresAt: new Date('2026-10-31T00:00:00.000Z'),
};

describe('property idempotency collisions inside a mutation transaction', () => {
  it('rejects a competing payload and preserves the first committed request', async () => {
    const { tx, records } = createStore();
    const outcomes = await Promise.allSettled([
      upsertIdempotencyRecord(tx, first),
      upsertIdempotencyRecord(tx, { ...first, requestHash: 'competing-request' }),
    ]);
    expect(outcomes[0]?.status).toBe('fulfilled');
    expect(outcomes[1]).toMatchObject({
      status: 'rejected', reason: { code: 'VALIDATION_ERROR' },
    });
    expect(records.get(`OWNER_TRANSFER:${first.key}`)?.[3]).toBe('first-request');
  });

  it('rejects a concurrent duplicate so its enclosing mutation rolls back and can retry', async () => {
    const { tx } = createStore();
    const outcomes = await Promise.allSettled([
      upsertIdempotencyRecord(tx, first),
      upsertIdempotencyRecord(tx, first),
    ]);
    expect(outcomes[0]?.status).toBe('fulfilled');
    expect(outcomes[1]).toMatchObject({
      status: 'rejected', reason: { code: 'RATE_LIMITED' },
    });
  });
});
