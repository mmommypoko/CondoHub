import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  listTickets,
  type TicketDto,
} from '@/modules/maintenance/application/index';
import { isTerminalTicketStatus } from '@/modules/maintenance/ui/ticketLabels';
import { TicketListCard } from '@/modules/maintenance/ui/TicketListCard';
import {
  findBuildingById,
  findRoomById,
} from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';

export const dynamic = 'force-dynamic';

async function roomLabel(roomId: string | null): Promise<string | null> {
  if (roomId === null) return null;
  const room = await findRoomById(db, roomId);
  if (room === null) return 'Room unavailable';
  const building = await findBuildingById(db, room.buildingId);
  return `${building?.code ?? 'Building'} · ${room.roomCode}`;
}

const STATUS_FILTERS = [
  'PENDING',
  'IN_PROGRESS',
  'WAITING_FOR_INFO',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
] as const;

function statusFilterLabel(status: string): string {
  if (status === 'IN_PROGRESS') return 'In progress';
  if (status === 'WAITING_FOR_INFO') return 'Waiting for info';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Pending';
}

export default async function AdminMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; page?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/maintenance');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const status = STATUS_FILTERS.find((entry) => entry === params.status);
  const kind =
    params.kind === 'COMMON_AREA' || params.kind === 'PROJECT_MANAGED_PRIVATE'
      ? params.kind
      : undefined;
  const feed = await listTickets(actor, {
    page,
    pageSize: 20,
    ...(status === undefined ? {} : { status }),
    ...(kind === undefined ? {} : { routingKind: kind }),
  });
  const open = feed.rows.filter((row: TicketDto) => !isTerminalTicketStatus(row.status));
  const history = feed.rows.filter((row: TicketDto) => isTerminalTicketStatus(row.status));
  const labels = new Map<string, string | null>();
  for (const row of feed.rows) {
    if (row.roomId !== null && !labels.has(row.roomId)) {
      labels.set(row.roomId, await roomLabel(row.roomId));
    }
  }
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  const query = new URLSearchParams();
  if (status !== undefined) query.set('status', status);
  if (kind !== undefined) query.set('kind', kind);
  const suffix = query.toString() === '' ? '' : `&${query.toString()}`;
  return (
    <main
      data-testid="admin-maintenance-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Maintenance inbox</h1>
        <p className="text-sm text-muted-foreground">
          Common-area and project-managed requests routed to the management team. Owner-room
          requests stay with the room owners and never appear here.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
        <Link
          data-testid="admin-maintenance-filter-all"
          href="/admin/maintenance"
          aria-current={kind === undefined && status === undefined ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          All
        </Link>
        <Link
          data-testid="admin-maintenance-filter-common"
          href="/admin/maintenance?kind=COMMON_AREA"
          aria-current={kind === 'COMMON_AREA' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Common area
        </Link>
        <Link
          data-testid="admin-maintenance-filter-managed"
          href="/admin/maintenance?kind=PROJECT_MANAGED_PRIVATE"
          aria-current={kind === 'PROJECT_MANAGED_PRIVATE' ? 'page' : undefined}
          className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
        >
          Managed room
        </Link>
      </div>
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="admin-maintenance-empty"
          icon={Wrench}
          title="Inbox clear"
          description="No requests match this filter right now."
        />
      ) : (
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="Open requests" className="flex min-w-0 flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Open ({open.length})</h2>
            {open.length === 0 ? (
              <p data-testid="admin-maintenance-open-empty" className="text-sm text-muted-foreground">
                No open requests in this view.
              </p>
            ) : (
              <ul data-testid="admin-maintenance-open-list" className="flex min-w-0 flex-col gap-3">
                {open.map((row) => (
                  <TicketListCard
                    key={row.id}
                    ticket={row}
                    roomLabel={row.roomId === null ? null : (labels.get(row.roomId) ?? null)}
                    detailHref={`/admin/maintenance/${row.id}`}
                    testIdPrefix="admin-maintenance"
                  />
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Request history" className="flex min-w-0 flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">History ({history.length})</h2>
            {history.length === 0 ? (
              <p data-testid="admin-maintenance-history-empty" className="text-sm text-muted-foreground">
                Closed requests will appear here.
              </p>
            ) : (
              <ul data-testid="admin-maintenance-history-list" className="flex min-w-0 flex-col gap-3">
                {history.map((row) => (
                  <TicketListCard
                    key={row.id}
                    ticket={row}
                    roomLabel={row.roomId === null ? null : (labels.get(row.roomId) ?? null)}
                    detailHref={`/admin/maintenance/${row.id}`}
                    testIdPrefix="admin-maintenance"
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Maintenance pages"
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            Page {page} of {totalPages} ({feed.total} requests)
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                data-testid="admin-maintenance-prev"
                href={`/admin/maintenance?page=${page - 1}${suffix}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                data-testid="admin-maintenance-next"
                href={`/admin/maintenance?page=${page + 1}${suffix}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
      <div className="hidden" aria-hidden="true">
        {STATUS_FILTERS.map((entry) => (
          <span key={entry}>{statusFilterLabel(entry)}</span>
        ))}
      </div>
    </main>
  );
}
