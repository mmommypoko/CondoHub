'use client';

import { Badge } from '@/shared/ui/Badge';
import type { InvoiceDto } from '@/modules/billing-payments/application/index';

function formatInstant(value: string | null): string {
  if (value === null) return 'Not issued yet';
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function kindLabel(kind: string): string {
  if (kind === 'PRIVATE_RENT') return 'Private rent';
  if (kind === 'PROJECT_MANAGED_RENT') return 'Project rent';
  return 'Common fee';
}

export function InvoiceDetailCard({ invoice }: { invoice: InvoiceDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            data-testid="invoice-detail-title"
            className="break-words text-xl font-semibold text-foreground"
          >
            {kindLabel(invoice.kind)} · {invoice.periodStart}
          </h1>
          <p className="break-all text-xs text-muted-foreground">
            <span data-testid="invoice-detail-id">{invoice.id}</span>
          </p>
        </div>
        <Badge data-testid="invoice-detail-kind" variant="info">
          {kindLabel(invoice.kind)}
        </Badge>
      </div>
      <dl
        data-testid="invoice-detail-facts"
        className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </dt>
          <dd data-testid="invoice-detail-total" className="break-words text-foreground">
            {invoice.total.amount} {invoice.total.currency}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Due date
          </dt>
          <dd data-testid="invoice-detail-due" className="break-words text-foreground">
            {invoice.dueDate}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Period
          </dt>
          <dd data-testid="invoice-detail-period" className="break-words text-foreground">
            {invoice.periodStart} to {invoice.periodEnd}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Issued
          </dt>
          <dd data-testid="invoice-detail-issued" className="break-words text-foreground">
            {formatInstant(invoice.issuedAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
