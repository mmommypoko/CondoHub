import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import { listOpenChargeEvents } from '@/modules/billing-payments/infrastructure/billingRepository';
import { satangToDecimalString } from '@/shared/utils/money';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';

export const dynamic = 'force-dynamic';

function formatAmount(value: bigint | null): string {
  if (value === null) return 'Rule-derived amount';
  return `${satangToDecimalString(value)} THB`;
}

export default async function AdminBillingEventsPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/events');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const rows = await listOpenChargeEvents(db);
  return (
    <main
      data-testid="charge-event-list-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">One-time billing events</h1>
          <p className="text-sm text-muted-foreground">
            Open events waiting for invoice issuance. Issued and cancelled events stay out of this
            list.
          </p>
        </div>
        <Link
          data-testid="charge-event-list-new"
          href="/admin/billing/events/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          New event
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          data-testid="charge-event-list-empty"
          title="No open events"
          description="Create a one-time event to bill every active room once."
          action={
            <Link
              data-testid="charge-event-list-empty-new"
              href="/admin/billing/events/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus aria-hidden="true" className="size-4" />
              New event
            </Link>
          }
        />
      ) : (
        <ul data-testid="charge-event-list" className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`charge-event-row-${row.id}`}
                  href={`/admin/billing/events/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
                >
                  Event {row.eventEffectiveDate}
                </Link>
                <Badge data-testid={`charge-event-status-${row.id}`} variant="neutral">
                  {row.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span data-testid={`charge-event-amount-${row.id}`}>{formatAmount(row.configuredAmount)}</span>
                <span>Created {row.createdAt.toISOString().slice(0, 10)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
