import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pg-proxy';
import type { Db } from '@/shared/db/transaction';
import { queryFacilityPage } from './facilityRepository';

vi.mock('server-only', () => ({}));

interface FacilityFixture {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  capacity: number;
  deletedAt: string | null;
}

interface CapturedQuery {
  sql: string;
  params: unknown[];
}

function fixture(overrides: Partial<FacilityFixture> & { id: string; name: string }): FacilityFixture {
  return {
    projectId: 'project-1',
    code: `code-${overrides.id}`,
    description: null,
    status: 'ACTIVE',
    capacity: 2,
    deletedAt: null,
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

function toArrayRow(row: FacilityFixture): Array<string | number | null> {
  return [
    row.id,
    row.projectId,
    row.code,
    row.name,
    row.description,
    row.status,
    row.capacity,
    row.deletedAt,
  ];
}

function createFacilityDb(fixtures: FacilityFixture[]): { db: Db; queries: CapturedQuery[] } {
  const queries: CapturedQuery[] = [];
  const proxy = drizzle(async (sql: string, params: unknown[]) => {
    queries.push({ sql, params: [...params] });
    let rows = fixtures.filter((row) => row.deletedAt === null);
    const status = placeholderParam(params, sql, /"status" = \$(\d+)/);
    if (typeof status === 'string') rows = rows.filter((row) => row.status === status);
    const pattern = placeholderParam(params, sql, /"name" ilike \$(\d+)/);
    if (typeof pattern === 'string') {
      const matcher = likePatternToRegExp(pattern);
      rows = rows.filter((row) => matcher.test(row.name));
    }
    const ordered = [...rows].sort(
      (left, right) =>
        left.name.localeCompare(right.name) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    if (sql.includes('count(*)')) return { rows: [[ordered.length]] };
    const limit = placeholderParam(params, sql, /limit \$(\d+)/);
    const offset = placeholderParam(params, sql, /offset \$(\d+)/);
    const start = typeof offset === 'number' ? offset : 0;
    const paged = typeof limit === 'number' ? ordered.slice(start, start + limit) : ordered.slice(start);
    return { rows: paged.map(toArrayRow) };
  });
  return { db: proxy as unknown as Db, queries };
}

function rowsQueryOf(queries: CapturedQuery[]): CapturedQuery {
  const found = queries.find((query) => !query.sql.includes('count(*)'));
  if (found === undefined) throw new Error('Expected a facility rows query.');
  return found;
}

describe('UT-FB-14 facility name filter matches live rows by ilike', () => {
  it('filters rows and total by a case-insensitive name match', async () => {
    const { db, queries } = createFacilityDb([
      fixture({ id: 'facility-arena', name: 'Grand Arena' }),
      fixture({ id: 'facility-annex', name: 'Arena Annex' }),
      fixture({ id: 'facility-pool', name: 'Rooftop Pool' }),
      fixture({ id: 'facility-gym', name: 'Gymnasium' }),
      fixture({ id: 'facility-storage', name: 'Arena Storage', status: 'INACTIVE' }),
      fixture({ id: 'facility-old', name: 'Old Arena Hall', deletedAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    const result = await queryFacilityPage(db, {
      status: 'ACTIVE',
      query: 'ARENA',
      page: 1,
      pageSize: 20,
    });

    expect(result.rows.map((row) => row.name)).toEqual(['Arena Annex', 'Grand Arena']);
    expect(result.total).toBe(2);
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => query.sql.includes('ilike'))).toBe(true);
    const rowsQuery = rowsQueryOf(queries);
    expect(placeholderParam(rowsQuery.params, rowsQuery.sql, /"name" ilike \$(\d+)/)).toBe('%ARENA%');
    expect(placeholderParam(rowsQuery.params, rowsQuery.sql, /"status" = \$(\d+)/)).toBe('ACTIVE');
  });

  it('trims the query and escapes LIKE wildcards literally', async () => {
    const { db, queries } = createFacilityDb([
      fixture({ id: 'facility-target', name: 'Room 100%_\\ Hall' }),
      fixture({ id: 'facility-decoy', name: 'Room 100%X_\\ Hall' }),
      fixture({ id: 'facility-gym', name: 'North Gym' }),
    ]);

    const result = await queryFacilityPage(db, { query: ' 100%_\\ ', page: 1, pageSize: 20 });

    expect(result.rows.map((row) => row.name)).toEqual(['Room 100%_\\ Hall']);
    expect(result.total).toBe(1);
    const rowsQuery = rowsQueryOf(queries);
    expect(placeholderParam(rowsQuery.params, rowsQuery.sql, /"name" ilike \$(\d+)/)).toBe(
      '%100\\%\\_\\\\%',
    );
  });

  it('returns every live facility when no query is given', async () => {
    const { db, queries } = createFacilityDb([
      fixture({ id: 'facility-b', name: 'Beta Hall' }),
      fixture({ id: 'facility-a', name: 'Alpha Hall' }),
      fixture({ id: 'facility-old', name: 'Old Hall', deletedAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    const result = await queryFacilityPage(db, { status: 'ACTIVE', page: 1, pageSize: 20 });

    expect(result.rows.map((row) => row.name)).toEqual(['Alpha Hall', 'Beta Hall']);
    expect(result.total).toBe(2);
    expect(queries).toHaveLength(2);
    expect(queries.every((query) => !query.sql.includes('ilike'))).toBe(true);
  });
});
