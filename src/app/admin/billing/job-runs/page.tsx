import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { listAdminJobRuns } from '@/modules/billing-payments/application/index';
import type { AdminJobResult } from '@/modules/billing-payments/domain/jobRedaction';

export const dynamic = 'force-dynamic';

function stateVariant(state: string): 'success' | 'danger' | 'pending' {
  if (state === 'DONE') return 'success';
  if (state === 'ERROR') return 'danger';
  return 'pending';
}

function formatInstant(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summaryOf(result: AdminJobResult | null): string {
  if (result === null) return 'No aggregate result yet';
  if ('transitioned' in result) {
    return `${result.transitioned} transitioned, ${result.skippedYoung + result.skippedRaced} skipped`;
  }
  return `${result.created} created, ${result.skipped} skipped, ${result.reviewRequired} for review`;
}

export default async function AdminBillingJobRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/job-runs');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const state =
    params.state === 'RUNNING' || params.state === 'DONE' || params.state === 'ERROR'
      ? params.state
      : undefined;
  const feed = await listAdminJobRuns(
    actor,
    {
      page,
      pageSize: 20,
      ...(state === undefined ? {} : { state }),
    },
  );
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  return (
    <main
      data-testid="job-run-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Billing job runs</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate invoice counts only. Per-room and per-owner detail never appears here.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by state">
        <Link
          data-testid="job-run-filter-all"
          href="/admin/billing/job-runs"
          aria-current={state === undefined ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          All
        </Link>
        <Link
          data-testid="job-run-filter-done"
          href="/admin/billing/job-runs?state=DONE"
          aria-current={state === 'DONE' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Done
        </Link>
        <Link
          data-testid="job-run-filter-error"
          href="/admin/billing/job-runs?state=ERROR"
          aria-current={state === 'ERROR' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Errors
        </Link>
        <Link
          data-testid="job-run-filter-running"
          href="/admin/billing/job-runs?state=RUNNING"
          aria-current={state === 'RUNNING' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Running
        </Link>
      </div>
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="job-run-list-empty"
          title="No job runs yet"
          description="When the billing job runs, each attempt and its aggregate result lands here."
        />
      ) : (
        <ul data-testid="job-run-list" className="flex flex-col gap-3">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`job-run-row-${row.id}`}
                  href={`/admin/billing/job-runs/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
                >
                  {row.jobName} · {row.businessKey}
                </Link>
                <Badge data-testid={`job-run-state-${row.id}`} variant={stateVariant(row.state)}>
                  {row.state}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span data-testid={`job-run-summary-${row.id}`}>{summaryOf(row.result)}</span>
                <span>Attempt {row.attempt}</span>
                <span>{formatInstant(row.startedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Job run pages"
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            Page {page} of {totalPages} ({feed.total} runs)
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                data-testid="job-run-list-prev"
                href={`/admin/billing/job-runs?page=${page - 1}${state === undefined ? '' : `&state=${state}`}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                data-testid="job-run-list-next"
                href={`/admin/billing/job-runs?page=${page + 1}${state === undefined ? '' : `&state=${state}`}`}
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
