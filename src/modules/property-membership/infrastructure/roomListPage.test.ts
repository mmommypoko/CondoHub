import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pg-proxy';
import type { Db } from '@/shared/db/transaction';
import { listRoomsByIds, queryRoomListPage } from './structureRepository';

vi.mock('server-only', () => ({}));

interface RoomFixture {
  id: string;
  floorId: string;
  buildingId: string;
  roomCode: string;
  name: string;
  areaSqm: string;
  status: 'ACTIVE' | 'INACTIVE';
  deletedAt: string | null;
  buildingStatus: 'ACTIVE' | 'INACTIVE';
  floorStatus: 'ACTIVE' | 'INACTIVE';
  buildingDeletedAt: string | null;
  floorDeletedAt: string | null;
}

interface CapturedQuery {
  sql: string;
  params: unknown[];
}

function fixture(overrides: Partial<RoomFixture> & { id: string }): RoomFixture {
  return {
    floorId: `floor-${overrides.id}`,
    buildingId: `building-${overrides.id}`,
    roomCode: `code-${overrides.id}`,
    name: `Room ${overrides.id}`,
    areaSqm: '42.50',
    status: 'ACTIVE',
    deletedAt: null,
    buildingStatus: 'ACTIVE',
    floorStatus: 'ACTIVE',
    buildingDeletedAt: null,
    floorDeletedAt: null,
    ...overrides,
  };
}

function placeholderParam(params: unknown[], sql: string, pattern: RegExp): unknown {
  const match = sql.match(pattern);
  if (match === null) return undefined;
  const ref = match[1];
  if (ref === undefined) return undefined;
  return params[Number(ref) - 1];
}

function escapeRegExpChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/, '\\$&');
}

function likePatternToRegExp(pattern: string): RegExp {
  let source = '';
  let index = 0;
  while (index < pattern.length) {
    const char = pattern[index] ?? '';
    if (char === '\\' && index + 1 < pattern.length) {
      source += escapeRegExpChar(pattern[index + 1] ?? '');
      index += 2;
    } else if (char === '%') {
      source += '.*';
      index += 1;
    } else if (char === '_') {
      source += '.';
      index += 1;
    } else {
      source += escapeRegExpChar(char);
      index += 1;
    }
  }
  return new RegExp(`^${source}$`, 'i');
}

function liveFixtures(fixtures: RoomFixture[]): RoomFixture[] {
  return fixtures.filter(
    (row) => row.deletedAt === null && row.buildingDeletedAt === null && row.floorDeletedAt === null,
  );
}

function effectiveStatus(row: RoomFixture): 'ACTIVE' | 'INACTIVE' {
  return row.floorStatus === 'ACTIVE' && row.buildingStatus === 'ACTIVE'
    ? row.status
    : 'INACTIVE';
}

function scopedFixtures(fixtures: RoomFixture[], ids: string[] | null): RoomFixture[] {
  if (ids === null) return fixtures;
  return fixtures.filter((row) => ids.includes(row.id));
}

function toRoomArrayRow(row: RoomFixture): Array<string | null> {
  return [
    row.id,
    row.floorId,
    row.buildingId,
    row.roomCode,
    row.name,
    row.areaSqm,
    row.status,
    row.deletedAt,
    row.floorStatus,
    row.buildingStatus,
  ];
}

function createRoomDb(fixtures: RoomFixture[]): { db: Db; queries: CapturedQuery[] } {
  const queries: CapturedQuery[] = [];
  const proxy = drizzle(async (sql: string, params: unknown[]) => {
    queries.push({ sql, params: [...params] });
    let rows = liveFixtures(fixtures);
    const ids = placeholderParam(params, sql, /"room"\."id" = any\(\$(\d+)::/);
    if (Array.isArray(ids)) rows = scopedFixtures(rows, ids as string[]);
    const buildingId = placeholderParam(params, sql, /"room"\."building_id" = \$(\d+)/);
    if (typeof buildingId === 'string')
      rows = rows.filter((row) => row.buildingId === buildingId);
    const status = placeholderParam(params, sql, /end = \$(\d+)/);
    if (typeof status === 'string')
      rows = rows.filter((row) => effectiveStatus(row) === status);
    const namePattern = placeholderParam(params, sql, /"room"\."name" ilike \$(\d+)/);
    const codePattern = placeholderParam(params, sql, /"room"\."room_code" ilike \$(\d+)/);
    const pattern = typeof namePattern === 'string' ? namePattern : codePattern;
    if (typeof pattern === 'string') {
      const matcher = likePatternToRegExp(pattern);
      rows = rows.filter((row) => matcher.test(row.name) || matcher.test(row.roomCode));
    }
    const ordered = [...rows].sort((left, right) =>
      left.roomCode < right.roomCode ? -1 : left.roomCode > right.roomCode ? 1 : left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
    if (sql.includes('count(*)')) return { rows: [[ordered.length]] };
    const limit = placeholderParam(params, sql, /limit \$(\d+)/);
    const offset = placeholderParam(params, sql, /offset \$(\d+)/);
    const start = typeof offset === 'number' ? offset : 0;
    const paged =
      typeof limit === 'number' ? ordered.slice(start, start + limit) : ordered.slice(start);
    return { rows: paged.map(toRoomArrayRow) };
  });
  return { db: proxy as unknown as Db, queries };
}

describe('BUG-026 room list paging runs in the database', () => {
  it('filters by actor scope, building, status, and name or code query', async () => {
    const { db } = createRoomDb([
      fixture({ id: 'room-a', buildingId: 'tower-1', roomCode: 'E2E-101', name: 'Garden 101' }),
      fixture({ id: 'room-b', buildingId: 'tower-1', roomCode: 'E2E-102', name: 'Garden 102' }),
      fixture({ id: 'room-c', buildingId: 'tower-1', roomCode: 'ZZZ', name: 'ZZZ Retreat' }),
      fixture({ id: 'room-d', buildingId: 'tower-9', roomCode: 'E2E-201', name: 'Garden 201' }),
      fixture({ id: 'room-e', buildingId: 'tower-1', roomCode: 'E2E-103', name: 'Garden 103', status: 'INACTIVE' }),
      fixture({ id: 'room-f', buildingId: 'tower-1', roomCode: 'E2E-999', deletedAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    const result = await queryRoomListPage(db, {
      roomIds: ['room-a', 'room-b', 'room-c', 'room-e'],
      buildingId: 'tower-1',
      status: 'ACTIVE',
      query: 'E2E-10',
      page: 1,
      pageSize: 20,
    });

    expect(result.rows.map((row) => row.id)).toEqual(['room-a', 'room-b']);
    expect(result.total).toBe(2);
  });

  it('matches the code when the name holds no match and returns full rows with one query round', async () => {
    const { db, queries } = createRoomDb([
      fixture({ id: 'room-a', roomCode: 'E2E-101', name: 'Unrelated name' }),
      fixture({ id: 'room-b', roomCode: 'ZZZ', name: 'ZZZ Retreat' }),
    ]);

    const result = await queryRoomListPage(db, {
      roomIds: null,
      query: 'E2E-101',
      page: 1,
      pageSize: 20,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      id: 'room-a',
      floorId: 'floor-room-a',
      buildingId: 'building-room-a',
      roomCode: 'E2E-101',
      name: 'Unrelated name',
      areaSqm: '42.50',
      status: 'ACTIVE',
    });
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => query.sql.includes('ilike'))).toBe(true);
  });

  it('slices pages by room code order with a stable id tiebreak', async () => {
    const { db } = createRoomDb([
      fixture({ id: 'room-b', roomCode: 'E2E-102' }),
      fixture({ id: 'room-a', roomCode: 'E2E-101' }),
      fixture({ id: 'room-c', roomCode: 'E2E-103' }),
    ]);

    const first = await queryRoomListPage(db, { roomIds: null, page: 1, pageSize: 2 });
    const second = await queryRoomListPage(db, { roomIds: null, page: 2, pageSize: 2 });

    expect(first.rows.map((row) => row.id)).toEqual(['room-a', 'room-b']);
    expect(first.total).toBe(3);
    expect(second.rows.map((row) => row.id)).toEqual(['room-c']);
    expect(second.total).toBe(3);
  });

  it('reports child rooms of an inactive building as inactive', async () => {
    const { db } = createRoomDb([
      fixture({ id: 'room-a', status: 'ACTIVE', buildingStatus: 'INACTIVE' }),
      fixture({ id: 'room-b', status: 'ACTIVE', buildingStatus: 'ACTIVE' }),
    ]);

    const active = await queryRoomListPage(db, { roomIds: null, status: 'ACTIVE', page: 1, pageSize: 20 });
    const inactive = await queryRoomListPage(db, { roomIds: null, status: 'INACTIVE', page: 1, pageSize: 20 });

    expect(active.rows.map((row) => row.id)).toEqual(['room-b']);
    expect(inactive.rows.map((row) => row.id)).toEqual(['room-a']);
    expect(inactive.rows[0]?.status).toBe('INACTIVE');
  });

  it('short circuits an empty actor scope without touching the database', async () => {
    const { db, queries } = createRoomDb([fixture({ id: 'room-a' })]);

    const result = await queryRoomListPage(db, { roomIds: [], page: 1, pageSize: 20 });

    expect(result).toEqual({ rows: [], total: 0 });
    expect(queries).toHaveLength(0);
  });
});

describe('BUG-027 room batch read uses one query', () => {
  it('returns every live room in one round ordered by code', async () => {
    const { db, queries } = createRoomDb([
      fixture({ id: 'room-b', roomCode: 'B-102' }),
      fixture({ id: 'room-a', roomCode: 'A-101' }),
      fixture({ id: 'room-gone', roomCode: 'A-000', deletedAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    const rows = await listRoomsByIds(db, ['room-b', 'room-a', 'room-missing', 'room-gone']);

    expect(rows.map((row) => row.id)).toEqual(['room-a', 'room-b']);
    expect(rows.every((row) => 'floorId' in row && 'buildingId' in row)).toBe(true);
    expect(queries).toHaveLength(1);
  });

  it('returns an empty list without a query when no ids are given', async () => {
    const { db, queries } = createRoomDb([fixture({ id: 'room-a' })]);

    await expect(listRoomsByIds(db, [])).resolves.toEqual([]);
    expect(queries).toHaveLength(0);
  });
});
