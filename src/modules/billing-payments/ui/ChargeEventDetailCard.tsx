'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge, EmptyState } from '@/shared/ui';
import type { ChargeEventDto } from '@/modules/billing-payments/application/index';
import { chargeEventStatusVariant, formatInstant } from '@/modules/billing-payments/ui/billingLabels';

export function ChargeEventDetailCard({ event }: { event: ChargeEventDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="charge-event-detail-title"
            className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Event {event.eventEffectiveDate}
          </h1>
          <p className="break-all text-xs leading-6 text-muted-foreground">
            <span data-testid="charge-event-detail-id">{event.id}</span>
          </p>
        </div>
        <Badge data-testid="charge-event-detail-status" variant={chargeEventStatusVariant(event.status)}>
          {event.status}
        </Badge>
      </div>
      {event.configuredAmount !== null ? (
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">Amount per room</p>
          <p
            data-testid="charge-event-detail-amount"
            className="break-words text-3xl font-semibold tracking-tight text-foreground tabular-nums"
          >
            {event.configuredAmount.amount} {event.configuredAmount.currency}
          </p>
        </div>
      ) : (
        <p data-testid="charge-event-detail-amount" className="text-sm leading-6 text-muted-foreground">
          Derived from the billing rule
        </p>
      )}
      <dl
        data-testid="charge-event-detail-facts"
        className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm sm:grid-cols-3"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">
            Effective date
          </dt>
          <dd data-testid="charge-event-detail-date" className="break-words font-medium text-foreground tabular-nums">
            {event.eventEffectiveDate}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">
            Created
          </dt>
          <dd data-testid="charge-event-detail-created" className="break-words font-medium text-foreground tabular-nums">
            {formatInstant(event.createdAt)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">
            Timezone
          </dt>
          <dd data-testid="charge-event-detail-timezone" className="break-words font-medium text-foreground">
            {event.projectTimezone ?? 'Asia/Bangkok'}
          </dd>
        </div>
      </dl>
      <section aria-label="Issuance" className="flex min-w-0 flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Issuance</h2>
        {event.status === 'OPEN' ? (
          <EmptyState
            data-testid="charge-event-detail-pending"
            title="Not issued yet"
            description="Invoices are issued by the billing job. This event stays open until issuance completes."
          />
        ) : event.status === 'ISSUED' ? (
          <EmptyState
            data-testid="charge-event-detail-issued"
            title="Issued"
            description="Invoices were generated from this event. Open the invoice list to review them."
            action={
              <Link
                data-testid="charge-event-detail-invoices"
                href="/admin/billing/invoices"
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-input-border bg-surface px-3 text-sm font-medium text-body-secondary transition-[background-color,color,border-color] duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Review invoices
              </Link>
            }
          />
        ) : (
          <EmptyState
            data-testid="charge-event-detail-cancelled"
            title="Cancelled"
            description="This event was cancelled and will not generate invoices."
          />
        )}
      </section>
    </div>
  );
}
