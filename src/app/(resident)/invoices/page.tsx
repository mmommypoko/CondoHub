import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge, DataTable, DataTableCell, DataTableRow, EmptyState, PageHeader, Pagination } from '@/shared/ui';
import { listInvoices } from '@/modules/billing-payments/application/index';
import { invoiceStateLabel, invoiceStateVariant, kindLabel } from '@/modules/billing-payments/ui/billingLabels';

export const dynamic = 'force-dynamic';

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
      <PageHeader
        title="My invoices"
        description="Only invoices issued for your rooms appear here. Open an invoice to pay or review slips."
      />
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="invoice-list-empty"
          title="No invoices yet"
          description="When the billing job issues invoices for your rooms, they appear here."
        />
      ) : (
        <DataTable
          testId="invoice-list"
          caption="Invoices issued for your rooms"
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
              <DataTableCell link href={`/invoices/${row.id}`} linkTestId={`invoice-row-${row.id}`}>
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
                <span data-testid={`invoice-total-${row.id}`}>
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
        pagePath="/invoices"
        testId="invoice-list-pages"
        nextTestId="invoice-list-next"
        prevTestId="invoice-list-prev"
        hideDisabledEnds
      />
    </main>
  );
}
