import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/db/client', () => ({
  db: { marker: 'central-db' },
  closeDb: async () => undefined,
}));

const seen: unknown[] = [];

vi.mock('@/modules/maintenance/infrastructure/ticketRepository', () => ({
  findTicketById: vi.fn(async (conn: unknown) => {
    seen.push(conn);
    return {
      id: 't-1',
      reporterId: 'member-1',
      roomId: null,
      locationDescription: 'Lobby',
      routingKind: 'COMMON_AREA',
      status: 'PENDING',
      subject: 'Leak',
      description: 'Water leak.',
      version: 1,
      snapshotBoundaryAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }),
  isTicketRecipient: vi.fn(async () => false),
}));

vi.mock('@/modules/maintenance/infrastructure/commentRepository', () => ({
  findTicketCommentById: vi.fn(async (conn: unknown) => {
    seen.push(conn);
    return null;
  }),
}));

import type { Actor } from '@/shared/auth/actor';
import type { Db } from '@/shared/db/transaction';
import { maintenanceScopeAcl } from './maintenanceScopeCallbacks';

const member: Actor = {
  userId: 'member-1',
  isSystemAdmin: false,
  accountStatus: 'ACTIVE',
  mustChangePassword: false,
};

describe('BUG-038 scope callbacks read through the passed connection', () => {
  it('uses the provided transaction for ticket reads instead of the central db', async () => {
    seen.length = 0;
    const tx = { marker: 'tx' } as unknown as Db;
    const verdict = await maintenanceScopeAcl(
      member,
      { scope: 'MAINTENANCE', entityRef: { type: 'maintenance_request', id: 't-1' } },
      new Date(),
      tx,
    );
    expect(verdict).toEqual({ allowed: true });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((conn) => conn === tx)).toBe(true);
  });

  it('falls back to the central db when no connection is passed', async () => {
    seen.length = 0;
    const { db } = await import('@/shared/db/client');
    const verdict = await maintenanceScopeAcl(
      member,
      { scope: 'MAINTENANCE', entityRef: { type: 'maintenance_request', id: 't-1' } },
      new Date(),
    );
    expect(verdict).toEqual({ allowed: true });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((conn) => conn === db)).toBe(true);
  });

  it('threads the connection through comment resolution', async () => {
    seen.length = 0;
    const tx = { marker: 'tx' } as unknown as Db;
    const verdict = await maintenanceScopeAcl(
      member,
      { scope: 'MAINTENANCE', entityRef: { type: 'maintenance_comment', id: 'c-1' } },
      new Date(),
      tx,
    );
    expect(verdict).toEqual({ allowed: false, reason: 'NO_CURRENT_ACCESS' });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(tx);
  });
});
