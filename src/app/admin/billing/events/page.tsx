import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import { listOpenChargeEvents } from '@/modules/billing-payments/infrastructure/billingRepository';
import { satangToDecimalString } from '@/shared/utils/money';
import { ACTION_LINK_CLASS, Badge, DataTable, DataTableCell, DataTableRow, EmptyState, PageHeader } from '@/shared/ui';
import { BillingSectionNav } from '@/modules/billing-payments/ui/BillingSectionNav';

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
      <PageHeader
        title="One-time billing events"
        description="Open events waiting for invoice issuance. Issued and cancelled events stay out of this list."
        actions={
          <Link
            data-testid="charge-event-list-new"
            href="/admin/billing/events/new"
            className={ACTION_LINK_CLASS}
          >
            <Plus aria-hidden="true" className="size-4" />
            New event
          </Link>
        }
      />
      <BillingSectionNav current="events" counts={{ events: rows.length }} />
      {rows.length === 0 ? (
        <EmptyState
          data-testid="charge-event-list-empty"
          title="No open events"
          description="Create a one-time event to bill every active room once."
          action={
            <Link
              data-testid="charge-event-list-empty-new"
              href="/admin/billing/events/new"
              className={ACTION_LINK_CLASS}
            >
              <Plus aria-hidden="true" className="size-4" />
              New event
            </Link>
          }
        />
      ) : (
        <DataTable
          testId="charge-event-list"
          caption="Open one-time billing events"
          columns={[
            { key: 'event', header: 'Event' },
            { key: 'status', header: 'Status' },
            { key: 'amount', header: 'Amount', numeric: true },
            { key: 'created', header: 'Created', numeric: true },
          ]}
        >
          {rows.map((row) => (
            <DataTableRow key={row.id} rowKey={row.id}>
              <DataTableCell link href={`/admin/billing/events/${row.id}`} linkTestId={`charge-event-row-${row.id}`}>
                Event {row.eventEffectiveDate}
              </DataTableCell>
              <DataTableCell>
                <Badge data-testid={`charge-event-status-${row.id}`} variant="neutral">
                  {row.status}
                </Badge>
              </DataTableCell>
              <DataTableCell numeric>
                <span data-testid={`charge-event-amount-${row.id}`}>{formatAmount(row.configuredAmount)}</span>
              </DataTableCell>
              <DataTableCell numeric>
                <span>Created {row.createdAt.toISOString().slice(0, 10)}</span>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      )}
    </main>
  );
}
