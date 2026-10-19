import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import {
  getInvoice,
  getPaymentInstruction,
  listInvoiceRevisions,
  listPaymentSubmissions,
} from '@/modules/billing-payments/application/index';
import { isUuid } from '@/shared/utils/idempotency';
import { InvoiceDetailCard } from '@/modules/billing-payments/ui/InvoiceDetailCard';
import { InvoicePaymentSections } from '@/modules/billing-payments/ui/InvoicePaymentSections';

export const dynamic = 'force-dynamic';

export default async function AdminBillingInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/invoices');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { id } = await params;
  if (!isUuid(id)) redirect('/admin/billing/invoices');
  const now = systemClock.now();
  const detail = await getInvoice(actor, id, now);
  if (detail === null) redirect('/admin/billing/invoices');
  const [submissions, revisions, instruction] = await Promise.all([
    listPaymentSubmissions(actor, id, now),
    listInvoiceRevisions(actor, id, now),
    getPaymentInstruction(actor, id, now),
  ]);
  return (
    <main
      data-testid="invoice-detail-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <Link
        data-testid="invoice-detail-back"
        href="/admin/billing/invoices"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to invoices
      </Link>
      <InvoiceDetailCard invoice={detail} />
      <InvoicePaymentSections
        invoice={detail}
        submissions={submissions}
        revisions={revisions}
        instruction={instruction}
        actorIsAdmin
      />
    </main>
  );
}
