import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { EmptyState, FILTER_LINK_ACTIVE, FILTER_LINK_BASE, FILTER_LINK_IDLE, PageHeader, Pagination, cx } from '@/shared/ui';
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
      <PageHeader
        title="Maintenance inbox"
        description="Common-area and project-managed requests routed to the management team. Owner-room requests stay with the room owners and never appear here."
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
        <Link
          data-testid="admin-maintenance-filter-all"
          href="/admin/maintenance"
          aria-current={kind === undefined && status === undefined ? 'page' : undefined}
          className={cx(
            FILTER_LINK_BASE,
            kind === undefined && status === undefined
              ? FILTER_LINK_ACTIVE
              : FILTER_LINK_IDLE,
          )}
        >
          All
        </Link>
        <Link
          data-testid="admin-maintenance-filter-common"
          href="/admin/maintenance?kind=COMMON_AREA"
          aria-current={kind === 'COMMON_AREA' ? 'page' : undefined}
          className={cx(
            FILTER_LINK_BASE,
            kind === 'COMMON_AREA'
              ? FILTER_LINK_ACTIVE
              : FILTER_LINK_IDLE,
          )}
        >
          Common area
        </Link>
        <Link
          data-testid="admin-maintenance-filter-managed"
          href="/admin/maintenance?kind=PROJECT_MANAGED_PRIVATE"
          aria-current={kind === 'PROJECT_MANAGED_PRIVATE' ? 'page' : undefined}
          className={cx(
            FILTER_LINK_BASE,
            kind === 'PROJECT_MANAGED_PRIVATE'
              ? FILTER_LINK_ACTIVE
              : FILTER_LINK_IDLE,
          )}
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
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-label="Open requests" className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">Open ({open.length})</h2>
            {open.length === 0 ? (
              <p data-testid="admin-maintenance-open-empty" className="text-sm leading-6 text-muted-foreground">
                No open requests in this view.
              </p>
            ) : (
              <ul data-testid="admin-maintenance-open-list" className="flex min-w-0 flex-col border-t border-border">
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
          <section aria-label="Request history" className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">History ({history.length})</h2>
            {history.length === 0 ? (
              <p data-testid="admin-maintenance-history-empty" className="text-sm leading-6 text-muted-foreground">
                Closed requests will appear here.
              </p>
            ) : (
              <ul data-testid="admin-maintenance-history-list" className="flex min-w-0 flex-col border-t border-border">
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
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={feed.total}
        pagePath="/admin/maintenance"
        querySuffix={suffix}
        testId="admin-maintenance-pages"
        nextTestId="admin-maintenance-next"
        prevTestId="admin-maintenance-prev"
        hideDisabledEnds
      />
      <div className="hidden" aria-hidden="true">
        {STATUS_FILTERS.map((entry) => (
          <span key={entry}>{statusFilterLabel(entry)}</span>
        ))}
      </div>
    </main>
  );
}
