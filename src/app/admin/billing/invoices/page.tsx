import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge, DataTable, DataTableCell, DataTableRow, EmptyState, PageHeader, Pagination, cx } from '@/shared/ui';
import { listInvoices } from '@/modules/billing-payments/application/index';
import { invoiceStateLabel, invoiceStateVariant, kindLabel } from '@/modules/billing-payments/ui/billingLabels';
import { FILTER_LINK_ACTIVE, FILTER_LINK_BASE, FILTER_LINK_IDLE } from '@/modules/billing-payments/ui/formControls';

export const dynamic = 'force-dynamic';

const BASE_PATH = '/admin/billing/invoices';

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
  const suffix = kind === undefined ? '' : `&kind=${kind}`;
  return (
    <main
      data-testid="invoice-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title="Invoices"
        description="Issued invoices with payment state and outstanding balances. Open an invoice to review slips."
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by kind">
        <Link
          data-testid="invoice-filter-all"
          href={BASE_PATH}
          aria-current={kind === undefined ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, kind === undefined ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          All
        </Link>
        <Link
          data-testid="invoice-filter-common"
          href={`${BASE_PATH}?kind=COMMON_FEE`}
          aria-current={kind === 'COMMON_FEE' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, kind === 'COMMON_FEE' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
        >
          Common fee
        </Link>
        <Link
          data-testid="invoice-filter-rent"
          href={`${BASE_PATH}?kind=PROJECT_MANAGED_RENT`}
          aria-current={kind === 'PROJECT_MANAGED_RENT' ? 'page' : undefined}
          className={cx(FILTER_LINK_BASE, kind === 'PROJECT_MANAGED_RENT' ? FILTER_LINK_ACTIVE : FILTER_LINK_IDLE)}
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
        <DataTable
          testId="invoice-list"
          caption="Issued invoices"
          columns={[
            { key: 'invoice', header: 'Invoice' },
            { key: 'state', header: 'State' },
            { key: 'total', header: 'Total', numeric: true },
            { key: 'outstanding', header: 'Outstanding', numeric: true },
            { key: 'due', header: 'Due', numeric: true },
          ]}
        >
          {feed.rows.map((row) => (
            <DataTableRow key={row.id} rowKey={row.id}>
              <DataTableCell link href={`${BASE_PATH}/${row.id}`} linkTestId={`invoice-row-${row.id}`}>
                {kindLabel(row.kind)} · {row.periodStart}
              </DataTableCell>
              <DataTableCell>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge data-testid={`invoice-state-${row.id}`} variant={invoiceStateVariant(row.state)}>
                    {invoiceStateLabel(row.state)}
                  </Badge>
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
                </span>
              </DataTableCell>
              <DataTableCell numeric>
                <span data-testid={`invoice-total-${row.id}`} className="font-medium text-foreground">
                  {row.total.amount} {row.total.currency}
                </span>
              </DataTableCell>
              <DataTableCell numeric>
                <span data-testid={`invoice-outstanding-${row.id}`}>
                  Outstanding {row.outstanding.amount} {row.outstanding.currency}
                </span>
              </DataTableCell>
              <DataTableCell numeric>
                <span>Due {row.dueDate}</span>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={feed.total}
        pagePath={BASE_PATH}
        querySuffix={suffix}
        testId="invoice-list-pages"
        nextTestId="invoice-list-next"
        prevTestId="invoice-list-prev"
        hideDisabledEnds
      />
    </main>
  );
}
