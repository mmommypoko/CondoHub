import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { listTurnoverReviews } from '@/modules/billing-payments/application/index';
import { getRoomDetail } from '@/modules/property-membership/application/index';

export const dynamic = 'force-dynamic';

type ReviewState = 'UNRESOLVED' | 'RESOLVED' | 'NO_CHARGE';

function stateFilter(value: string | undefined): ReviewState | undefined {
  if (value === 'UNRESOLVED' || value === 'RESOLVED' || value === 'NO_CHARGE') return value;
  return undefined;
}

function stateLabel(state: ReviewState): string {
  if (state === 'RESOLVED') return 'Resolved';
  if (state === 'NO_CHARGE') return 'No charge';
  return 'Unresolved';
}

function stateVariant(state: ReviewState): 'warning' | 'success' | 'neutral' {
  if (state === 'RESOLVED') return 'success';
  if (state === 'NO_CHARGE') return 'neutral';
  return 'warning';
}

function filterHref(state: ReviewState | undefined): string {
  if (state === undefined) return '/admin/billing/turnover-reviews';
  return `/admin/billing/turnover-reviews?state=${state}`;
}

export default async function AdminTurnoverReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/turnover-reviews');
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
  return (
    <main
      data-testid="turnover-review-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Turnover reviews</h1>
          <p className="text-sm text-muted-foreground">
            Unresolved reviews stay here until someone issues invoices or records no charge. No
            deadlines, no automatic billing.
          </p>
        </div>
        <Badge data-testid="turnover-review-unresolved-indicator" variant="warning">
          {feed.unresolvedCount} unresolved
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by state">
        <Link
          data-testid="turnover-review-filter-all"
          href={filterHref(undefined)}
          aria-current={state === undefined ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          All
        </Link>
        <Link
          data-testid="turnover-review-filter-unresolved"
          href={filterHref('UNRESOLVED')}
          aria-current={state === 'UNRESOLVED' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Unresolved
        </Link>
        <Link
          data-testid="turnover-review-filter-resolved"
          href={filterHref('RESOLVED')}
          aria-current={state === 'RESOLVED' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Resolved
        </Link>
        <Link
          data-testid="turnover-review-filter-no-charge"
          href={filterHref('NO_CHARGE')}
          aria-current={state === 'NO_CHARGE' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
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
        <ul data-testid="turnover-review-list" className="flex flex-col gap-3">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`turnover-review-row-${row.id}`}
                  href={`/admin/billing/turnover-reviews/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
                >
                  {roomCodes.get(row.roomId) ?? row.roomId} · {row.calendarMonth}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge data-testid={`turnover-review-state-${row.id}`} variant={stateVariant(row.state)}>
                    {stateLabel(row.state)}
                  </Badge>
                  {row.blocked ? (
                    <Badge data-testid={`turnover-review-blocked-${row.id}`} variant="danger">
                      Blocked
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{row.managementModeAtCreation === 'PROJECT_MANAGED' ? 'Project-managed' : 'Private'}</span>
                <span>{row.candidateTenancyIds.length} candidate tenancies</span>
                <span>Version {row.version}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Turnover review pages"
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            Page {page} of {totalPages} ({feed.total} reviews)
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                data-testid="turnover-review-list-prev"
                href={`/admin/billing/turnover-reviews?page=${page - 1}${state === undefined ? '' : `&state=${state}`}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                data-testid="turnover-review-list-next"
                href={`/admin/billing/turnover-reviews?page=${page + 1}${state === undefined ? '' : `&state=${state}`}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
