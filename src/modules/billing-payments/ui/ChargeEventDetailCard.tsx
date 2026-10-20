'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ACTION_LINK_CLASS, Badge, EmptyState, cx } from '@/shared/ui';
import type { ChargeEventDto } from '@/modules/billing-payments/application/index';
import {
  chargeEventStatusVariant,
  formatInstant,
} from '@/modules/billing-payments/ui/billingLabels';

export function ChargeEventDetailCard({ event }: { event: ChargeEventDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:p-7">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="charge-event-detail-title"
            className="break-words text-display leading-display font-semibold tracking-tight text-foreground"
          >
            Event {event.eventEffectiveDate}
          </h1>
          <p className="break-all text-small leading-small text-muted-foreground">
            <span data-testid="charge-event-detail-id">{event.id}</span>
          </p>
        </div>
        <Badge
          data-testid="charge-event-detail-status"
          variant={chargeEventStatusVariant(event.status)}
        >
          {event.status}
        </Badge>
      </div>
      {event.configuredAmount !== null ? (
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-small font-medium text-muted-foreground">Amount per room</p>
          <p
            data-testid="charge-event-detail-amount"
            className="ui-tabular break-words text-display font-semibold tracking-tight text-foreground"
          >
            {event.configuredAmount.amount} {event.configuredAmount.currency}
          </p>
        </div>
      ) : (
        <p
          data-testid="charge-event-detail-amount"
          className="text-small leading-small text-muted-foreground"
        >
          Derived from the billing rule
        </p>
      )}
      <dl
        data-testid="charge-event-detail-facts"
        className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-5 rounded-xl border border-border bg-background p-5 text-body sm:grid-cols-3"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-small font-medium text-muted-foreground">Effective date</dt>
          <dd
            data-testid="charge-event-detail-date"
            className="break-words font-medium text-foreground ui-tabular"
          >
            {event.eventEffectiveDate}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-small font-medium text-muted-foreground">Created</dt>
          <dd
            data-testid="charge-event-detail-created"
            className="break-words font-medium text-foreground ui-tabular"
          >
            {formatInstant(event.createdAt)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-small font-medium text-muted-foreground">Timezone</dt>
          <dd
            data-testid="charge-event-detail-timezone"
            className="break-words font-medium text-foreground"
          >
            {event.projectTimezone ?? 'Asia/Bangkok'}
          </dd>
        </div>
      </dl>
      <section aria-label="Issuance" className="flex min-w-0 flex-col gap-3">
        <h2 className="text-heading font-semibold tracking-tight text-foreground">Issuance</h2>
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
                className={cx(ACTION_LINK_CLASS, 'h-8')}
              >
                Review invoices
                <ArrowRight aria-hidden="true" className="size-4" />
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
