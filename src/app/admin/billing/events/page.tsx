import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import { listOpenChargeEvents } from '@/modules/billing-payments/infrastructure/billingRepository';
import { satangToDecimalString } from '@/shared/utils/money';
import {
  Badge,
  DataTable,
  DataTableCell,
  DataTableRow,
  EmptyState,
  FormDialog,
  PageHeader,
} from '@/shared/ui';
import { ChargeEventCreateForm } from '@/modules/billing-payments/ui/ChargeEventCreateForm';
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
      className="mx-auto flex w-full max-w-[var(--ui-content-wide)] flex-col gap-7 px-4 py-7 sm:px-6 lg:p-8"
    >
      <PageHeader
        title="One-time billing events"
        description="Open events waiting for invoice issuance. Issued and cancelled events stay out of this list."
        actions={
          <FormDialog
            triggerLabel="New billing event"
            title="New one-time event"
            triggerTestId="charge-event-list-new"
            testId="charge-event-create-dialog"
          >
            <ChargeEventCreateForm />
          </FormDialog>
        }
      />
      <BillingSectionNav current="events" counts={{ events: rows.length }} />
      {rows.length === 0 ? (
        <EmptyState
          data-testid="charge-event-list-empty"
          title="No open events"
          description="Create a one-time event to bill every active room once."
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
              <DataTableCell
                link
                href={`/admin/billing/events/${row.id}`}
                linkTestId={`charge-event-row-${row.id}`}
              >
                Event {row.eventEffectiveDate}
              </DataTableCell>
              <DataTableCell>
                <Badge data-testid={`charge-event-status-${row.id}`} variant="neutral">
                  {row.status}
                </Badge>
              </DataTableCell>
              <DataTableCell numeric>
                <span data-testid={`charge-event-amount-${row.id}`}>
                  {formatAmount(row.configuredAmount)}
                </span>
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
