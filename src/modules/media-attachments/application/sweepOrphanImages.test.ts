import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/db/client', () => ({ db: {} }));

const listOrphanSweepCandidates = vi.fn();
const markImageOrphaned = vi.fn();

vi.mock('../infrastructure/imageRepository', () => ({
  listOrphanSweepCandidates: (...args: unknown[]) => listOrphanSweepCandidates(...args),
  markImageOrphaned: (...args: unknown[]) => markImageOrphaned(...args),
}));

import type { Db } from '@/shared/db/transaction';
import { fakeClock } from '../../../tests/fakes';
import type { MediaCtx } from './ctx';
import {
  SWEEP_ORPHANS_BATCH_SIZE,
  SWEEP_ORPHANS_MAX_ROWS,
  clampSweepBatchSize,
  sweepOrphanImages,
} from './sweepOrphanImages';
import type { ImageAttachmentRecord } from '../infrastructure/imageRepository';

const NOW = new Date('2026-10-15T06:00:00.000Z');

function ctx(): MediaCtx {
  return { clock: fakeClock(NOW), requestId: 'sweep-test', isSeedActor: false };
}

function row(id: string): ImageAttachmentRecord {
  return {
    id,
    uploadedBy: 'user-1',
    objectKey: `chat/${id}.png`,
    scope: 'CHAT',
    mime: 'image/png',
    mimeVerified: false,
    sizeBytes: 100,
    sha256: null,
    width: null,
    height: null,
    state: 'PENDING',
    ownerEntityType: null,
    ownerEntityId: null,
    attachedAt: null,
    rejectReason: null,
    createdAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    expiresAt: null,
  };
}

function fakeDb(): Db {
  return {
    transaction: async <T>(fn: (tx: never) => Promise<T>): Promise<T> => fn({} as never),
  } as unknown as Db;
}

describe('BUG-029 sweep batch size honoring', () => {
  it('defaults the fetch limit to 100 when batchSize is absent', async () => {
    listOrphanSweepCandidates.mockResolvedValueOnce([]);
    const result = await sweepOrphanImages(ctx(), {
      database: fakeDb(),
      removeObject: async () => {},
    });
    expect(result.caughtUp).toBe(true);
    expect(listOrphanSweepCandidates).toHaveBeenCalledTimes(1);
    const input = listOrphanSweepCandidates.mock.calls[0]?.[1] as { limit: number };
    expect(input.limit).toBe(SWEEP_ORPHANS_BATCH_SIZE);
    expect(SWEEP_ORPHANS_BATCH_SIZE).toBe(100);
  });

  it('passes an explicit batchSize through as the fetch limit', async () => {
    listOrphanSweepCandidates.mockResolvedValueOnce([]);
    await sweepOrphanImages(ctx(), {
      database: fakeDb(),
      removeObject: async () => {},
      batchSize: 7,
    });
    const input = listOrphanSweepCandidates.mock.calls[0]?.[1] as { limit: number };
    expect(input.limit).toBe(7);
  });

  it('clamps batchSize to 1..MAX_ROWS and falls back to the default for non-integers', () => {
    expect(clampSweepBatchSize(undefined)).toBe(100);
    expect(clampSweepBatchSize(7)).toBe(7);
    expect(clampSweepBatchSize(0)).toBe(1);
    expect(clampSweepBatchSize(-4)).toBe(1);
    expect(clampSweepBatchSize(500)).toBe(500);
    expect(clampSweepBatchSize(501)).toBe(500);
    expect(clampSweepBatchSize(2.5)).toBe(100);
    expect(clampSweepBatchSize(Number.NaN)).toBe(100);
  });

  it('caps the run at MAX_ROWS rows even when the fetch limit is large', async () => {
    const batch = Array.from({ length: SWEEP_ORPHANS_MAX_ROWS }, (_, index) =>
      row(`img-${index}`),
    );
    listOrphanSweepCandidates.mockResolvedValue(batch);
    markImageOrphaned.mockResolvedValue(true);
    const removed: string[] = [];
    const result = await sweepOrphanImages(ctx(), {
      database: fakeDb(),
      removeObject: async (objectKey: string) => {
        removed.push(objectKey);
      },
      batchSize: 500,
    });
    expect(result.scanned).toBe(SWEEP_ORPHANS_MAX_ROWS);
    expect(result.transitioned).toBe(SWEEP_ORPHANS_MAX_ROWS);
    expect(result.caughtUp).toBe(false);
    expect(removed).toHaveLength(SWEEP_ORPHANS_MAX_ROWS);
  });
});
