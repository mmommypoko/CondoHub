'use client';

import { Badge } from '@/shared/ui';
import type { InvoiceDto } from '@/modules/billing-payments/application/index';
import { formatInstant, invoiceStateLabel, invoiceStateVariant, kindLabel } from '@/modules/billing-payments/ui/billingLabels';

export function InvoiceDetailCard({ invoice }: { invoice: InvoiceDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="invoice-detail-title"
            className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {kindLabel(invoice.kind)} · {invoice.periodStart}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge data-testid="invoice-detail-kind" variant="info">
            {kindLabel(invoice.kind)}
          </Badge>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">Total due</p>
        <p
          data-testid="invoice-detail-total"
          className="break-words text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl"
        >
          {invoice.total.amount} {invoice.total.currency}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          <Badge data-testid="invoice-detail-state" variant={invoiceStateVariant(invoice.state)}>
            {invoiceStateLabel(invoice.state)}
          </Badge>
        </p>
      </div>
      <dl
        data-testid="invoice-detail-facts"
        className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm sm:grid-cols-3"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">Due date</dt>
          <dd data-testid="invoice-detail-due" className="break-words font-medium text-foreground tabular-nums">
            {invoice.dueDate}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">Period</dt>
          <dd data-testid="invoice-detail-period" className="break-words font-medium text-foreground tabular-nums">
            {invoice.periodStart} to {invoice.periodEnd}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">Issued</dt>
          <dd data-testid="invoice-detail-issued" className="break-words font-medium text-foreground tabular-nums">
            {invoice.issuedAt === null ? 'Not issued yet' : formatInstant(invoice.issuedAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
