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

export default async function AdminBillingInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/invoices');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const kind =
    params.kind === 'COMMON_FEE' || params.kind === 'PROJECT_MANAGED_RENT'
      ? params.kind
      : undefined;
  const feed = await listInvoices(
    actor,
    {
      page,
      pageSize: 20,
      at: systemClock.now(),
      ...(kind === undefined ? {} : { kind }),
    },
  );
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  return (
    <main
      data-testid="invoice-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Generation-proof view of issued invoices. Payments arrive with the next billing slice.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by kind">
        <Link
          data-testid="invoice-filter-all"
          href="/admin/billing/invoices"
          aria-current={kind === undefined ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          All
        </Link>
        <Link
          data-testid="invoice-filter-common"
          href="/admin/billing/invoices?kind=COMMON_FEE"
          aria-current={kind === 'COMMON_FEE' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Common fee
        </Link>
        <Link
          data-testid="invoice-filter-rent"
          href="/admin/billing/invoices?kind=PROJECT_MANAGED_RENT"
          aria-current={kind === 'PROJECT_MANAGED_RENT' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Project rent
        </Link>
      </div>
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="invoice-list-empty"
          title="No invoices yet"
          description="When the billing job issues invoices, they appear here with totals and due dates."
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
                  href={`/admin/billing/invoices/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
                >
                  {kindLabel(row.kind)} · {row.periodStart}
                </Link>
                <Badge data-testid={`invoice-total-${row.id}`} variant="neutral">
                  {row.total.amount} {row.total.currency}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Due {row.dueDate}</span>
                <span>Period {row.periodStart} to {row.periodEnd}</span>
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
                href={`/admin/billing/invoices?page=${page - 1}${kind === undefined ? '' : `&kind=${kind}`}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                data-testid="invoice-list-next"
                href={`/admin/billing/invoices?page=${page + 1}${kind === undefined ? '' : `&kind=${kind}`}`}
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
