import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import {
  getInvoice,
  getInvoiceUiPermissions,
  getPaymentInstruction,
  listInvoiceRevisions,
  listPaymentSubmissions,
} from '@/modules/billing-payments/application/index';
import { isUuid } from '@/shared/utils/idempotency';
import { getRoomLabels } from '@/modules/property-membership/application/index';
import { InvoiceDetailCard } from '@/modules/billing-payments/ui/InvoiceDetailCard';
import { InvoicePaymentSections } from '@/modules/billing-payments/ui/InvoicePaymentSections';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/invoices');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/invoices');
  const { id } = await params;
  if (!isUuid(id)) redirect('/invoices');
  const now = systemClock.now();
  const detail = await getInvoice(actor, id, now);
  if (detail === null) redirect('/invoices');
  const [submissions, revisions, instruction, permissions] = await Promise.all([
    listPaymentSubmissions(actor, id, now),
    listInvoiceRevisions(actor, id, now),
    getPaymentInstruction(actor, id, now),
    getInvoiceUiPermissions(actor, id, now),
  ]);
  const roomLabel = (await getRoomLabels([detail.roomId]))[0]?.label;
  return (
    <main
      data-testid="invoice-detail-page"
      className="mx-auto flex w-full max-w-[var(--ui-content-wide)] flex-col gap-7 px-4 py-7 sm:px-6 lg:p-8"
    >
      <Link
        data-testid="invoice-detail-back"
        href="/invoices"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to bills
      </Link>
      <InvoiceDetailCard invoice={detail} roomLabel={roomLabel} />
      <InvoicePaymentSections
        invoice={detail}
        submissions={submissions}
        revisions={revisions}
        instruction={instruction}
        actorIsAdmin={actor.isSystemAdmin}
        permissions={permissions}
      />
    </main>
  );
}
