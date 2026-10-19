import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge, DataTable, DataTableCell, DataTableRow, EmptyState, PageHeader, Pagination, cx } from '@/shared/ui';
import { listAdminJobRuns } from '@/modules/billing-payments/application/index';
import type { AdminJobResult } from '@/modules/billing-payments/domain/jobRedaction';
import { formatInstant, jobRunStateVariant } from '@/modules/billing-payments/ui/billingLabels';
import { FILTER_LINK_ACTIVE, FILTER_LINK_BASE, FILTER_LINK_IDLE } from '@/modules/billing-payments/ui/formControls';

export const dynamic = 'force-dynamic';

const BASE_PATH = '/admin/billing/job-runs';

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
  if (actor === null) redirect(`/login?returnUrl=${BASE_PATH}`);
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
  const suffix = state === undefined ? '' : `&state=${state}`;
  return (
    <main
      data-testid="job-run-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title="Billing job runs"
        description="Aggregate invoice counts only. Per-room and per-owner detail never appears here."
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by state">
        <Link
          data-testid="job-run-filter-all"
          href={BASE_PATH}
          aria-current={state === undefined ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === undefined ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          All
        </Link>
        <Link
          data-testid="job-run-filter-done"
          href={`${BASE_PATH}?state=DONE`}
          aria-current={state === 'DONE' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === 'DONE' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          Done
        </Link>
        <Link
          data-testid="job-run-filter-error"
          href={`${BASE_PATH}?state=ERROR`}
          aria-current={state === 'ERROR' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === 'ERROR' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          Errors
        </Link>
        <Link
          data-testid="job-run-filter-running"
          href={`${BASE_PATH}?state=RUNNING`}
          aria-current={state === 'RUNNING' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, state === 'RUNNING' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
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
        <DataTable
          testId="job-run-list"
          caption="Billing job runs"
          columns={[
            { key: 'run', header: 'Run' },
            { key: 'state', header: 'State' },
            { key: 'summary', header: 'Summary' },
            { key: 'attempt', header: 'Attempt', numeric: true },
            { key: 'started', header: 'Started', numeric: true },
          ]}
        >
          {feed.rows.map((row) => (
            <DataTableRow key={row.id} rowKey={row.id}>
              <DataTableCell link href={`${BASE_PATH}/${row.id}`} linkTestId={`job-run-row-${row.id}`}>
                {row.jobName} · {row.businessKey}
              </DataTableCell>
              <DataTableCell>
                <Badge data-testid={`job-run-state-${row.id}`} variant={jobRunStateVariant(row.state)}>
                  {row.state}
                </Badge>
              </DataTableCell>
              <DataTableCell>
                <span data-testid={`job-run-summary-${row.id}`}>{summaryOf(row.result)}</span>
              </DataTableCell>
              <DataTableCell numeric>
                <span>Attempt {row.attempt}</span>
              </DataTableCell>
              <DataTableCell numeric>
                <span>{formatInstant(row.startedAt)}</span>
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
        testId="job-run-list-pages"
        nextTestId="job-run-list-next"
        prevTestId="job-run-list-prev"
        hideDisabledEnds
      />
    </main>
  );
}
