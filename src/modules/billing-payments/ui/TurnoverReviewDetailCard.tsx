'use client';

import { Badge } from '@/shared/ui/Badge';

export interface TurnoverReviewCandidateWindow {
  tenancyId: string;
  startsAt: string;
  endsAt: string | null;
  state: string;
}

export interface TurnoverReviewDetailView {
  id: string;
  roomCode: string;
  calendarMonth: string;
  cycleStart: string;
  state: 'UNRESOLVED' | 'RESOLVED' | 'NO_CHARGE';
  modeLabel: string;
  version: number;
  blocked: boolean;
  candidates: TurnoverReviewCandidateWindow[];
  invoiceIds: string[];
  decisionType: string | null;
  reason: string | null;
  decidedAt: string | null;
}

function stateVariant(state: TurnoverReviewDetailView['state']): 'warning' | 'success' | 'neutral' {
  if (state === 'RESOLVED') return 'success';
  if (state === 'NO_CHARGE') return 'neutral';
  return 'warning';
}

function stateLabel(state: TurnoverReviewDetailView['state']): string {
  if (state === 'RESOLVED') return 'Resolved';
  if (state === 'NO_CHARGE') return 'No charge';
  return 'Unresolved';
}

export function TurnoverReviewDetailCard({ review }: { review: TurnoverReviewDetailView }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="turnover-review-detail-title"
            className="break-words text-xl font-semibold text-foreground"
          >
            {review.roomCode} · {review.calendarMonth}
          </h1>
          <p className="break-all text-xs text-muted-foreground">
            <span data-testid="turnover-review-detail-id">{review.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge data-testid="turnover-review-detail-state" variant={stateVariant(review.state)}>
            {stateLabel(review.state)}
          </Badge>
          {review.blocked ? (
            <Badge data-testid="turnover-review-detail-blocked" variant="danger">
              Blocked
            </Badge>
          ) : null}
        </div>
      </div>
      <dl
        data-testid="turnover-review-detail-facts"
        className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Management
          </dt>
          <dd data-testid="turnover-review-detail-mode" className="break-words text-foreground">
            {review.modeLabel}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cycle start
          </dt>
          <dd data-testid="turnover-review-detail-cycle" className="break-words text-foreground">
            {review.cycleStart}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Version
          </dt>
          <dd data-testid="turnover-review-detail-version" className="break-words text-foreground">
            {review.version}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Invoices
          </dt>
          <dd data-testid="turnover-review-detail-invoices" className="break-words text-foreground">
            {review.invoiceIds.length === 0 ? 'None' : review.invoiceIds.length}
          </dd>
        </div>
      </dl>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Candidate tenancies</h2>
        {review.candidates.length === 0 ? (
          <p data-testid="turnover-review-detail-candidates-empty" className="text-sm text-muted-foreground">
            No candidate tenancy windows are on record for this review.
          </p>
        ) : (
          <ul data-testid="turnover-review-detail-candidates" className="flex flex-col gap-2">
            {review.candidates.map((candidate) => (
              <li
                key={candidate.tenancyId}
                className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <span className="break-all font-medium text-foreground">{candidate.tenancyId}</span>
                <span className="text-xs text-muted-foreground">
                  {candidate.startsAt} to {candidate.endsAt ?? 'present'} · {candidate.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Decision</h2>
        {review.decisionType === null ? (
          <p data-testid="turnover-review-detail-decision" className="text-sm text-muted-foreground">
            No decision yet. This review stays in the queue until someone issues invoices or records
            no charge.
          </p>
        ) : (
          <dl
            data-testid="turnover-review-detail-decision"
            className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Decision
              </dt>
              <dd className="break-words text-foreground">
                {review.decisionType === 'NO_CHARGE' ? 'No charge' : 'Issue invoices'}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Decided
              </dt>
              <dd className="break-words text-foreground">{review.decidedAt ?? 'Unknown'}</dd>
            </div>
            {review.reason !== null && review.reason !== '' ? (
              <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reason
                </dt>
                <dd className="break-words text-foreground">{review.reason}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </div>
      {review.blocked ? (
        <p data-testid="turnover-review-detail-blocked-note" role="alert" className="text-sm text-danger">
          This review has no responsible owners on record, so it cannot be resolved until the
          ownership history is fixed.
        </p>
      ) : null}
      {review.invoiceIds.length > 0 ? (
        <ul data-testid="turnover-review-detail-invoice-list" className="flex min-w-0 flex-col gap-1">
          {review.invoiceIds.map((invoiceId) => (
            <li key={invoiceId} className="break-all text-xs text-muted-foreground">
              {invoiceId}
            </li>
          ))}
        </ul>
      ) : null}
      <p data-testid="turnover-review-detail-payments-seam" className="text-sm text-muted-foreground">
        Payments and balance history arrive with the next billing slice.
      </p>
    </div>
  );
}
