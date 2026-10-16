'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { ChargeEventDto } from '@/modules/billing-payments/application/index';

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

function statusVariant(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'ISSUED') return 'success';
  if (status === 'CANCELLED') return 'warning';
  return 'neutral';
}

export function ChargeEventDetailCard({ event }: { event: ChargeEventDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="charge-event-detail-title"
            className="break-words text-xl font-semibold text-foreground"
          >
            Event {event.eventEffectiveDate}
          </h1>
          <p className="break-all text-xs text-muted-foreground">
            <span data-testid="charge-event-detail-id">{event.id}</span>
          </p>
        </div>
        <Badge data-testid="charge-event-detail-status" variant={statusVariant(event.status)}>
          {event.status}
        </Badge>
      </div>
      <dl
        data-testid="charge-event-detail-facts"
        className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Effective date
          </dt>
          <dd data-testid="charge-event-detail-date" className="break-words text-foreground">
            {event.eventEffectiveDate}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Amount
          </dt>
          <dd data-testid="charge-event-detail-amount" className="break-words text-foreground">
            {event.configuredAmount === null
              ? 'Derived from the billing rule'
              : `${event.configuredAmount.amount} ${event.configuredAmount.currency}`}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Created
          </dt>
          <dd data-testid="charge-event-detail-created" className="break-words text-foreground">
            {formatInstant(event.createdAt)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Timezone
          </dt>
          <dd data-testid="charge-event-detail-timezone" className="break-words text-foreground">
            {event.projectTimezone ?? 'Asia/Bangkok'}
          </dd>
        </div>
      </dl>
      <section aria-label="Issuance" className="flex min-w-0 flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Issuance</h2>
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
