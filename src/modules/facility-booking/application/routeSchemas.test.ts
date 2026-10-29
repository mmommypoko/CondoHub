import { describe, expect, it } from 'vitest';
import { facilityBookingsQuery, facilityListQuery } from './routeSchemas';

describe('UT-FB-14 facility search and booking paging queries', () => {
  it('accepts an optional name query alongside status and paging', () => {
    expect(
      facilityListQuery.parse({ status: 'ACTIVE', query: 'arena', page: '2', pageSize: '10' }),
    ).toMatchObject({ status: 'ACTIVE', query: 'arena', page: 2, pageSize: 10 });
  });

  it('trims the name query and keeps it optional', () => {
    expect(facilityListQuery.parse({})).toMatchObject({ page: 1, pageSize: 20 });
    expect(facilityListQuery.parse({}).query).toBeUndefined();
    expect(facilityListQuery.parse({ query: '  arena  ' }).query).toBe('arena');
  });

  it('rejects queries longer than the UI limit', () => {
    expect(facilityListQuery.safeParse({ query: 'a'.repeat(255) }).success).toBe(true);
    expect(facilityListQuery.safeParse({ query: 'a'.repeat(256) }).success).toBe(false);
  });

  it('defaults booking paging while clamping invalid values', () => {
    expect(facilityBookingsQuery.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(facilityBookingsQuery.parse({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
    });
    expect(facilityBookingsQuery.safeParse({ page: '0' }).success).toBe(false);
    expect(facilityBookingsQuery.safeParse({ pageSize: '101' }).success).toBe(false);
  });
});
