import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge, DataTable, DataTableCell, DataTableRow, EmptyState, PageHeader, Pagination, cx } from '@/shared/ui';
import { listTurnoverReviews } from '@/modules/billing-payments/application/index';
import { getRoomDetail } from '@/modules/property-membership/application/index';
import { turnoverStateLabel, turnoverStateVariant } from '@/modules/billing-payments/ui/billingLabels';
import { FILTER_LINK_ACTIVE, FILTER_LINK_BASE, FILTER_LINK_IDLE } from '@/modules/billing-payments/ui/formControls';

export const dynamic = 'force-dynamic';

type ReviewState = 'UNRESOLVED' | 'RESOLVED' | 'NO_CHARGE';

const BASE_PATH = '/admin/billing/turnover-reviews';

function stateFilter(value: string | undefined): ReviewState | undefined {
  if (value === 'UNRESOLVED' || value === 'RESOLVED' || value === 'NO_CHARGE') return value;
  return undefined;
}

function filterHref(state: ReviewState | undefined): string {
  if (state === undefined) return BASE_PATH;
  return `${BASE_PATH}?state=${state}`;
}

export default async function AdminTurnoverReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect(`/login?returnUrl=${BASE_PATH}`);
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const state = stateFilter(params.state);
  const feed = await listTurnoverReviews(
    actor,
    {
      page,
      pageSize: 20,
      ...(state === undefined ? {} : { state }),
    },
  );
  const roomCodes = new Map<string, string>();
  for (const row of feed.rows) {
    if (roomCodes.has(row.roomId)) continue;
    try {
      const room = await getRoomDetail(row.roomId);
      roomCodes.set(row.roomId, room.roomCode);
    } catch {
      roomCodes.set(row.roomId, row.roomId);
    }
  }
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  const suffix = state === undefined ? '' : `&state=${state}`;
  return (
    <main
      data-testid="turnover-review-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title="Turnover reviews"
        description="Unresolved reviews stay here until someone issues invoices or records no charge. No deadlines, no automatic billing."
        actions={
          <Badge data-testid="turnover-review-unresolved-indicator" variant="warning">
            {feed.unresolvedCount} unresolved
          </Badge>
        }
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by state">
        <Link
          data-testid="turnover-review-filter-all"
          href={filterHref(undefined)}
          aria-current={state === undefined ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === undefined ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          All
        </Link>
        <Link
          data-testid="turnover-review-filter-unresolved"
          href={filterHref('UNRESOLVED')}
          aria-current={state === 'UNRESOLVED' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === 'UNRESOLVED' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          Unresolved
        </Link>
        <Link
          data-testid="turnover-review-filter-resolved"
          href={filterHref('RESOLVED')}
          aria-current={state === 'RESOLVED' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === 'RESOLVED' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          Resolved
        </Link>
        <Link
          data-testid="turnover-review-filter-no-charge"
          href={filterHref('NO_CHARGE')}
          aria-current={state === 'NO_CHARGE' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === 'NO_CHARGE' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          No charge
        </Link>
      </div>
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="turnover-review-list-empty"
          title="No turnover reviews"
          description="When the billing job finds more than one tenancy in a month, the review lands here for a decision."
        />
      ) : (
        <DataTable
          testId="turnover-review-list"
          caption="Turnover reviews awaiting a rent decision"
          columns={[
            { key: 'review', header: 'Review' },
            { key: 'mode', header: 'Mode' },
            { key: 'state', header: 'State' },
            { key: 'candidates', header: 'Candidates', numeric: true },
            { key: 'version', header: 'Version', numeric: true },
          ]}
        >
          {feed.rows.map((row) => (
            <DataTableRow key={row.id} rowKey={row.id}>
              <DataTableCell link href={`${BASE_PATH}/${row.id}`} linkTestId={`turnover-review-row-${row.id}`}>
                {roomCodes.get(row.roomId) ?? row.roomId} · {row.calendarMonth}
              </DataTableCell>
              <DataTableCell>
                <span>{row.managementModeAtCreation === 'PROJECT_MANAGED' ? 'Project-managed' : 'Private'}</span>
              </DataTableCell>
              <DataTableCell>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge data-testid={`turnover-review-state-${row.id}`} variant={turnoverStateVariant(row.state)}>
                    {turnoverStateLabel(row.state)}
                  </Badge>
                  {row.blocked ? (
                    <Badge data-testid={`turnover-review-blocked-${row.id}`} variant="danger">
                      Blocked
                    </Badge>
                  ) : null}
                </span>
              </DataTableCell>
              <DataTableCell numeric>
                <span>{row.candidateTenancyIds.length} candidate tenancies</span>
              </DataTableCell>
              <DataTableCell numeric>
                <span>Version {row.version}</span>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={feed.total}
        pagePath={BASE_PATH}
        querySuffix={suffix}
        testId="turnover-review-list-pages"
        nextTestId="turnover-review-list-next"
        prevTestId="turnover-review-list-prev"
        hideDisabledEnds
      />
    </main>
  );
}
