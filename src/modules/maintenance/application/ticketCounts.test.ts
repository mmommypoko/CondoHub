import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/db/client', () => ({
  db: {},
  closeDb: async () => undefined,
}));
vi.mock('@/modules/media-attachments/application/index', () => ({
  listAttachedImagesForEntity: vi.fn(async () => []),
}));

interface FakeTicket {
  id: string;
  reporterId: string;
  roomId: string | null;
  locationDescription: string;
  routingKind: 'COMMON_AREA' | 'PRIVATE_OWNER' | 'PROJECT_MANAGED_PRIVATE';
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_FOR_INFO' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  subject: string;
  description: string;
  version: number;
  snapshotBoundaryAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const store = {
  tickets: [] as FakeTicket[],
  recipients: new Map<string, string[]>(),
};

function ticket(overrides: Partial<FakeTicket> & { id: string }): FakeTicket {
  return {
    reporterId: 'rep-a',
    roomId: null,
    locationDescription: 'Lobby',
    routingKind: 'COMMON_AREA',
    status: 'PENDING',
    subject: 'Leak',
    description: 'Water leak.',
    version: 1,
    snapshotBoundaryAt: new Date('2026-10-01T00:00:00.000Z'),
    createdAt: new Date('2026-10-10T00:00:00.000Z'),
    updatedAt: new Date('2026-10-10T00:00:00.000Z'),
    ...overrides,
  };
}

vi.mock('@/modules/maintenance/infrastructure/ticketRepository', () => ({
  findTicketById: vi.fn(async (_conn: unknown, id: string) => {
    return store.tickets.find((row) => row.id === id) ?? null;
  }),
  isTicketMemberVisible: vi.fn(async (_conn: unknown, input: { ticketId: string; userId: string }) => {
    const row = store.tickets.find((ticketRow) => ticketRow.id === input.ticketId);
    if (row === undefined) return false;
    if (row.reporterId === input.userId) return true;
    return (store.recipients.get(input.ticketId) ?? []).includes(input.userId);
  }),
  isTicketRecipient: vi.fn(async (_conn: unknown, input: { ticketId: string; userId: string }) => {
    return (store.recipients.get(input.ticketId) ?? []).includes(input.userId);
  }),
  listTicketsForAdmin: vi.fn(async (_conn: unknown, input: { limit: number; offset: number }) => {
    const rows = store.tickets.filter((row) => row.routingKind !== 'PRIVATE_OWNER');
    return { rows: rows.slice(input.offset, input.offset + input.limit), total: rows.length };
  }),
  listTicketsForMember: vi.fn(async (_conn: unknown, input: { userId: string; limit: number; offset: number }) => {
    const rows = store.tickets.filter(
      (row) =>
        row.reporterId === input.userId ||
        (store.recipients.get(row.id) ?? []).includes(input.userId),
    );
    return { rows: rows.slice(input.offset, input.offset + input.limit), total: rows.length };
  }),
}));

vi.mock('@/modules/maintenance/infrastructure/commentRepository', () => ({
  listTicketComments: vi.fn(async () => []),
  findTicketCommentById: vi.fn(async () => null),
}));

vi.mock('@/modules/maintenance/infrastructure/historyRepository', () => ({
  listStatusHistory: vi.fn(async () => []),
}));

import type { Actor } from '@/shared/auth/actor';
import type { Db } from '@/shared/db/transaction';
import { listTickets } from './ticketReads';

const conn = {} as Db;

const member: Actor = {
  userId: 'member-1',
  isSystemAdmin: false,
  accountStatus: 'ACTIVE',
  mustChangePassword: false,
};

const admin: Actor = {
  userId: 'admin-1',
  isSystemAdmin: true,
  accountStatus: 'ACTIVE',
  mustChangePassword: false,
};

function resetStore(): void {
  store.tickets = [
    ticket({ id: 't-own', reporterId: 'member-1', routingKind: 'COMMON_AREA', status: 'PENDING' }),
    ticket({ id: 't-recipient-common', reporterId: 'rep-x', routingKind: 'COMMON_AREA', status: 'PENDING' }),
    ticket({
      id: 't-private',
      reporterId: 'rep-y',
      routingKind: 'PRIVATE_OWNER',
      status: 'IN_PROGRESS',
      roomId: 'r-1',
    }),
  ];
  store.recipients = new Map([
    ['t-recipient-common', ['member-1']],
    ['t-private', ['member-1']],
  ]);
}

describe('BUG-036 ticket total matches the displayed rows', () => {
  beforeEach(() => {
    resetStore();
  });

  it('excludes a stray recipient row on an admin-routed ticket from both rows and total', async () => {
    const page = await listTickets(member, { page: 1, pageSize: 10 }, conn);
    expect(page.rows.map((row) => row.id).sort()).toEqual(['t-own', 't-private'].sort());
    expect(page.total).toBe(2);
  });

  it('keeps total exact on later pages under permission filtering', async () => {
    const first = await listTickets(member, { page: 1, pageSize: 1 }, conn);
    expect(first.rows).toHaveLength(1);
    expect(first.total).toBe(2);
    const second = await listTickets(member, { page: 2, pageSize: 1 }, conn);
    expect(second.rows).toHaveLength(1);
    expect(second.total).toBe(2);
    expect(second.rows[0]?.id).not.toBe(first.rows[0]?.id);
  });

  it('returns the plain count when nothing is filtered out', async () => {
    store.tickets = [ticket({ id: 't-only', reporterId: 'member-1' })];
    store.recipients = new Map();
    const page = await listTickets(member, { page: 1, pageSize: 10 }, conn);
    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it('keeps admin totals consistent with admin-visible rows', async () => {
    const page = await listTickets(admin, { page: 1, pageSize: 10 }, conn);
    expect(page.rows.map((row) => row.id).sort()).toEqual(
      ['t-own', 't-recipient-common'].sort(),
    );
    expect(page.total).toBe(2);
  });
});
