'use client';

import Link from 'next/link';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { JobRunDetail } from '@/modules/billing-payments/application/index';

function formatInstant(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function stateVariant(state: string): 'success' | 'danger' | 'pending' {
  if (state === 'DONE') return 'success';
  if (state === 'ERROR') return 'danger';
  return 'pending';
}

export function JobRunDetailCard({ run }: { run: JobRunDetail }) {
  const result = run.result;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="job-run-detail-title"
            className="break-words text-xl font-semibold text-foreground"
          >
            {run.jobName} · {run.businessKey}
          </h1>
          <p className="break-all text-xs text-muted-foreground">
            <span data-testid="job-run-detail-id">{run.id}</span>
          </p>
        </div>
        <Badge data-testid="job-run-detail-state" variant={stateVariant(run.state)}>
          {run.state}
        </Badge>
      </div>
      <dl
        data-testid="job-run-detail-facts"
        className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Attempt
          </dt>
          <dd data-testid="job-run-detail-attempt" className="break-words text-foreground">
            {run.attempt}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trigger
          </dt>
          <dd data-testid="job-run-detail-trigger" className="break-words text-foreground">
            {run.triggerSource}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Started
          </dt>
          <dd data-testid="job-run-detail-started" className="break-words text-foreground">
            {formatInstant(run.startedAt)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Finished
          </dt>
          <dd data-testid="job-run-detail-finished" className="break-words text-foreground">
            {run.finishedAt === null ? 'Still running' : formatInstant(run.finishedAt)}
          </dd>
        </div>
      </dl>
      <section aria-label="Aggregate result" className="flex min-w-0 flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Aggregate result</h2>
        {result === null ? (
          <EmptyState
            data-testid="job-run-detail-no-result"
            title="Result pending"
            description="This run has not finished yet, so there is no aggregate result to show."
          />
        ) : 'transitioned' in result ? (
          <dl
            data-testid="job-run-detail-result"
            className="grid min-w-0 grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-4"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Transitioned
              </dt>
              <dd data-testid="job-run-detail-transitioned" className="text-foreground">
                {result.transitioned}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Skipped young
              </dt>
              <dd data-testid="job-run-detail-skipped-young" className="text-foreground">
                {result.skippedYoung}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Objects deleted
              </dt>
              <dd data-testid="job-run-detail-s3-deleted" className="text-foreground">
                {result.s3Deleted}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Caught up
              </dt>
              <dd data-testid="job-run-detail-caught-up" className="text-foreground">
                {result.caughtUp ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        ) : (
          <dl
            data-testid="job-run-detail-result"
            className="grid min-w-0 grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-4"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Created
              </dt>
              <dd data-testid="job-run-detail-created" className="text-foreground">
                {result.created}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Skipped
              </dt>
              <dd data-testid="job-run-detail-skipped" className="text-foreground">
                {result.skipped}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Review
              </dt>
              <dd data-testid="job-run-detail-review" className="text-foreground">
                {result.reviewRequired}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Caught up
              </dt>
              <dd data-testid="job-run-detail-caught-up" className="text-foreground">
                {result.caughtUp ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        )}
        {result !== null && 'nextFromCycle' in result && result.nextFromCycle !== undefined ? (
          <p className="text-xs text-muted-foreground">
            Next window starts at <span data-testid="job-run-detail-next">{result.nextFromCycle}</span>.
          </p>
        ) : null}
      </section>
      {run.state === 'ERROR' ? (
        <p data-testid="job-run-detail-error" role="alert" className="text-sm text-danger">
          {run.errorMessage ?? `Failed with code ${run.errorCode ?? 'UNKNOWN'}.`}
        </p>
      ) : null}
      {run.jobName === 'generate-invoices' ? (
        <Link
          data-testid="job-run-detail-invoices"
          href="/admin/billing/invoices"
          className="text-sm font-medium text-link hover:underline"
        >
          Review generated invoices
        </Link>
      ) : null}
    </div>
  );
}
