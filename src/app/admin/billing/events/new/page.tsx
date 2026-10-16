import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { ChargeEventCreateForm } from '@/modules/billing-payments/ui/ChargeEventCreateForm';

export const dynamic = 'force-dynamic';

export default async function AdminBillingEventNewPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/events/new');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  return (
    <main
      data-testid="charge-event-new-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">New one-time event</h1>
        <p className="text-sm text-muted-foreground">
          The effective date is required. The billing job issues invoices from open events.
        </p>
      </div>
      <ChargeEventCreateForm />
    </main>
  );
}
