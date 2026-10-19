import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { EmptyState, PageHeader, Pagination } from '@/shared/ui';
import { listInvoices } from '@/modules/billing-payments/application/index';
import { BillingSectionNav } from '@/modules/billing-payments/ui/BillingSectionNav';
import { FilterBar } from '@/shared/ui';
import { InvoiceTable } from '@/modules/billing-payments/ui/InvoiceTable';

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
      data-testid="admin-invoice-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title="Invoices"
        description="Issued invoices with payment state and outstanding balances. Open an invoice to review slips."
      />
      <BillingSectionNav current="invoices" counts={{}} />
      <FilterBar
        label="Filter by kind"
        activeValue={kind ?? 'ALL'}
        options={[
          { value: 'ALL', testId: 'invoice-filter-all', href: BASE_PATH, label: 'All' },
          {
            value: 'COMMON_FEE',
            testId: 'invoice-filter-common',
            href: `${BASE_PATH}?kind=COMMON_FEE`,
            label: 'Common fee',
          },
          {
            value: 'PROJECT_MANAGED_RENT',
            testId: 'invoice-filter-rent',
            href: `${BASE_PATH}?kind=PROJECT_MANAGED_RENT`,
            label: 'Project rent',
          },
        ]}
      />
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="invoice-list-empty"
          title="No invoices yet"
          description="When the billing job issues invoices, they appear here with totals and due dates."
        />
      ) : (
        <InvoiceTable rows={feed.rows} basePath={BASE_PATH} caption="Issued invoices" />
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
