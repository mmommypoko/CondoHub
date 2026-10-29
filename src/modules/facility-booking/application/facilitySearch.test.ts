import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryFacilityPage = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/shared/db/client', () => ({ db: {} }));

vi.mock('../infrastructure/facilityRepository', () => ({
  queryFacilityPage: (...args: unknown[]) => queryFacilityPage(...args),
}));

import { db } from '@/shared/db/client';
import { fakeActor } from '@/tests/fakes';
import type { FacilityRecord } from '../infrastructure/facilityRepository';
import { listFacilityPage } from './facilities';
import { facilityListQuery } from './routeSchemas';

function facilityRecord(overrides?: Partial<FacilityRecord>): FacilityRecord {
  return {
    id: 'facility-1',
    projectId: 'project-1',
    code: 'arena',
    name: 'Grand Arena',
    description: null,
    status: 'ACTIVE',
    capacity: 2,
    ...overrides,
  };
}

describe('UT-FB-14 facility name query threads from schema into the repository filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards the parsed trimmed query into the repository filter', async () => {
    queryFacilityPage.mockResolvedValue({ rows: [facilityRecord()], total: 1 });
    const parsed = facilityListQuery.parse({ query: '  arena  ', page: '2', pageSize: '10' });

    const page = await listFacilityPage(fakeActor(), {
      status: parsed.status,
      query: parsed.query,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });

    expect(queryFacilityPage).toHaveBeenCalledWith(db, {
      status: undefined,
      query: 'arena',
      page: 2,
      pageSize: 10,
    });
    expect(page).toEqual({
      rows: [
        {
          id: 'facility-1',
          projectId: 'project-1',
          code: 'arena',
          name: 'Grand Arena',
          description: null,
          status: 'ACTIVE',
          capacity: 2,
        },
      ],
      total: 1,
    });
  });

  it('passes an absent query through as undefined', async () => {
    queryFacilityPage.mockResolvedValue({ rows: [facilityRecord()], total: 1 });
    const parsed = facilityListQuery.parse({});

    await listFacilityPage(fakeActor(), {
      status: parsed.status,
      query: parsed.query,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });

    expect(queryFacilityPage).toHaveBeenCalledWith(db, {
      status: undefined,
      query: undefined,
      page: 1,
      pageSize: 20,
    });
  });
});
