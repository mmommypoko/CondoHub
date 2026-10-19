import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { EmptyState, PageHeader, Pagination } from '@/shared/ui';
import { listInvoices } from '@/modules/billing-payments/application/index';
import { InvoiceTable } from '@/modules/billing-payments/ui/InvoiceTable';

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
        title="Bills"
        description="Bills issued for your rooms. Open a bill to pay or review payment slips."
      />
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="invoice-list-empty"
          title="No bills yet"
          description="When new bills are issued for your rooms, they appear here."
        />
      ) : (
        <InvoiceTable rows={feed.rows} basePath="/invoices" caption="Bills issued for your rooms" />
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
