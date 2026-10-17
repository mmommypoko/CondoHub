import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { listInvoices } from '@/modules/billing-payments/application/index';

export const dynamic = 'force-dynamic';

function kindLabel(kind: string): string {
  if (kind === 'PRIVATE_RENT') return 'Private rent';
  if (kind === 'PROJECT_MANAGED_RENT') return 'Project rent';
  return 'Common fee';
}

function stateLabel(state: string): string {
  if (state === 'PAID') return 'Paid';
  if (state === 'PARTIALLY_PAID') return 'Partially paid';
  return 'Unpaid';
}

function stateVariant(state: string): 'success' | 'info' | 'warning' {
  if (state === 'PAID') return 'success';
  if (state === 'PARTIALLY_PAID') return 'info';
  return 'warning';
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/invoices');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/invoices');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const feed = await listInvoices(
    actor,
    { page, pageSize: 20, at: systemClock.now() },
  );
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  return (
    <main
      data-testid="invoice-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">My invoices</h1>
        <p className="text-sm text-muted-foreground">
          Only invoices issued for your rooms appear here. Open an invoice to pay or review slips.
        </p>
      </div>
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="invoice-list-empty"
          title="No invoices yet"
          description="When the billing job issues invoices for your rooms, they appear here."
        />
      ) : (
        <ul data-testid="invoice-list" className="flex flex-col gap-3">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`invoice-row-${row.id}`}
                  href={`/invoices/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
                >
                  {kindLabel(row.kind)} · {row.periodStart}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge data-testid={`invoice-state-${row.id}`} variant={stateVariant(row.state)}>
                    {stateLabel(row.state)}
                  </Badge>
                  <Badge data-testid={`invoice-total-${row.id}`} variant="neutral">
                    {row.total.amount} {row.total.currency}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Due {row.dueDate}</span>
                <span>Period {row.periodStart} to {row.periodEnd}</span>
                <span data-testid={`invoice-outstanding-${row.id}`}>
                  Outstanding {row.outstanding.amount} {row.outstanding.currency}
                </span>
                {row.overdue ? (
                  <Badge data-testid={`invoice-overdue-${row.id}`} variant="danger">
                    Overdue
                  </Badge>
                ) : null}
                {row.pendingOnPaid ? (
                  <Badge data-testid={`invoice-pending-on-paid-${row.id}`} variant="warning">
                    Paid, slips pending
                  </Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Invoice pages"
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            Page {page} of {totalPages} ({feed.total} invoices)
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                data-testid="invoice-list-prev"
                href={`/invoices?page=${page - 1}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                data-testid="invoice-list-next"
                href={`/invoices?page=${page + 1}`}
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
