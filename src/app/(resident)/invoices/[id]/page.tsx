import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { getInvoice } from '@/modules/billing-payments/application/index';
import { isUuid } from '@/shared/utils/idempotency';
import { InvoiceDetailCard } from '@/modules/billing-payments/ui/InvoiceDetailCard';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/invoices');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/invoices');
  const { id } = await params;
  if (!isUuid(id)) redirect('/invoices');
  const detail = await getInvoice(actor, id, systemClock.now());
  if (detail === null) redirect('/invoices');
  return (
    <main
      data-testid="invoice-detail-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <Link
        data-testid="invoice-detail-back"
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to invoices
      </Link>
      <InvoiceDetailCard invoice={detail} />
    </main>
  );
}
