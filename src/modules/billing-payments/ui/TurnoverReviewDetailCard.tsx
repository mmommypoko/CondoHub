'use client';

import { Badge } from '@/shared/ui';
import { turnoverStateLabel, turnoverStateVariant } from '@/modules/billing-payments/ui/billingLabels';

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

export function TurnoverReviewDetailCard({ review }: { review: TurnoverReviewDetailView }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="turnover-review-detail-title"
            className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {review.roomCode} · {review.calendarMonth}
          </h1>
          <p className="break-all text-xs leading-6 text-muted-foreground">
            <span data-testid="turnover-review-detail-id">{review.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge data-testid="turnover-review-detail-state" variant={turnoverStateVariant(review.state)}>
            {turnoverStateLabel(review.state)}
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
        className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm sm:grid-cols-4"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">
            Management
          </dt>
          <dd data-testid="turnover-review-detail-mode" className="break-words font-medium text-foreground">
            {review.modeLabel}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">
            Cycle start
          </dt>
          <dd data-testid="turnover-review-detail-cycle" className="break-words font-medium text-foreground tabular-nums">
            {review.cycleStart}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">
            Version
          </dt>
          <dd data-testid="turnover-review-detail-version" className="break-words font-medium text-foreground tabular-nums">
            {review.version}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">
            Invoices
          </dt>
          <dd data-testid="turnover-review-detail-invoices" className="break-words font-medium text-foreground tabular-nums">
            {review.invoiceIds.length === 0 ? 'None' : review.invoiceIds.length}
          </dd>
        </div>
      </dl>
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Candidate tenancies</h2>
        {review.candidates.length === 0 ? (
          <p data-testid="turnover-review-detail-candidates-empty" className="text-sm leading-6 text-muted-foreground">
            No candidate tenancy windows are on record for this review.
          </p>
        ) : (
          <ul data-testid="turnover-review-detail-candidates" className="flex min-w-0 flex-col gap-0 divide-y divide-border rounded-xl border border-border bg-surface">
            {review.candidates.map((candidate) => (
              <li
                key={candidate.tenancyId}
                className="flex min-w-0 flex-col gap-0.5 p-4 text-sm"
              >
                <span className="font-medium text-foreground">
                  {candidate.startsAt} to {candidate.endsAt ?? 'present'} · {candidate.state}
                </span>
                <span className="break-all text-xs leading-6 text-muted-foreground tabular-nums">
                  {candidate.tenancyId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Decision</h2>
        {review.decisionType === null ? (
          <p data-testid="turnover-review-detail-decision" className="text-sm leading-6 text-muted-foreground">
            No decision yet. This review stays in the queue until someone issues invoices or records
            no charge.
          </p>
        ) : (
          <dl
            data-testid="turnover-review-detail-decision"
            className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-sm font-medium text-muted-foreground">
                Decision
              </dt>
              <dd className="break-words font-medium text-foreground">
                {review.decisionType === 'NO_CHARGE' ? 'No charge' : 'Issue invoices'}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-sm font-medium text-muted-foreground">
                Decided
              </dt>
              <dd className="break-words font-medium text-foreground tabular-nums">{review.decidedAt ?? 'Unknown'}</dd>
            </div>
            {review.reason !== null && review.reason !== '' ? (
              <div className="flex min-w-0 flex-col gap-0.5 sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">
                  Reason
                </dt>
                <dd className="break-words font-medium text-foreground">{review.reason}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </div>
      {review.blocked ? (
        <p data-testid="turnover-review-detail-blocked-note" role="alert" className="text-sm leading-6 font-medium text-danger-foreground">
          This review has no responsible owners on record, so it cannot be resolved until the
          ownership history is fixed.
        </p>
      ) : null}
      {review.invoiceIds.length > 0 ? (
        <ul data-testid="turnover-review-detail-invoice-list" className="flex min-w-0 flex-col gap-1">
          {review.invoiceIds.map((invoiceId) => (
            <li key={invoiceId} className="break-all text-xs leading-6 text-muted-foreground">
              {invoiceId}
            </li>
          ))}
        </ul>
      ) : null}
      <p data-testid="turnover-review-detail-payments-seam" className="text-sm leading-6 text-muted-foreground">
        Payments and balance history arrive with the next billing slice.
      </p>
    </div>
  );
}
