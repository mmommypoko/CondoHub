import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getCommonFeeEvent } from '@/modules/billing-payments/application/index';
import { isUuid } from '@/shared/utils/idempotency';
import { ChargeEventDetailCard } from '@/modules/billing-payments/ui/ChargeEventDetailCard';

export const dynamic = 'force-dynamic';

export default async function AdminBillingEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/events');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { id } = await params;
  if (!isUuid(id)) redirect('/admin/billing/events');
  const detail = await getCommonFeeEvent(actor, id);
  if (detail === null) redirect('/admin/billing/events');
  return (
    <main
      data-testid="charge-event-detail-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <Link
          data-testid="charge-event-detail-back"
          href="/admin/billing/events"
          className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back to billing events
        </Link>
        <Link
          data-testid="charge-event-detail-new"
          href="/admin/billing/events/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          New event
        </Link>
      </div>
      <ChargeEventDetailCard event={detail} />
      <EmptyState
        data-testid="charge-event-detail-history"
        title="Issued invoices"
        description="Per-room invoices for this event appear on the admin invoice list once the event is issued."
      />
    </main>
  );
}
