import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Wrench } from 'lucide-react';
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

function openRows(rows: TicketDto[]): TicketDto[] {
  return rows.filter((row) => !isTerminalTicketStatus(row.status));
}

function historyRows(rows: TicketDto[]): TicketDto[] {
  return rows.filter((row) => isTerminalTicketStatus(row.status));
}

export default async function MaintenancePage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/maintenance');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/maintenance');
  const feed = await listTickets(actor, { page: 1, pageSize: 100 });
  const open = openRows(feed.rows);
  const history = historyRows(feed.rows);
  const labels = new Map<string, string | null>();
  for (const row of [...open, ...history]) {
    if (row.roomId !== null && !labels.has(row.roomId)) {
      labels.set(row.roomId, await roomLabel(row.roomId));
    }
  }
  return (
    <main
      data-testid="maintenance-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">My requests</h1>
          <p className="text-sm text-muted-foreground">
            Track the requests you reported and the rooms assigned to you. Closed requests move to
            history.
          </p>
        </div>
        <Link
          data-testid="maintenance-new-link"
          href="/maintenance/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          New request
        </Link>
      </div>
      <section aria-label="Open requests" className="flex min-w-0 flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Open requests ({open.length})
        </h2>
        {open.length === 0 ? (
          <EmptyState
            data-testid="maintenance-open-empty"
            icon={Wrench}
            title="No open requests"
            description="Submit a new request when something needs fixing."
          />
        ) : (
          <ul data-testid="maintenance-open-list" className="flex min-w-0 flex-col gap-3">
            {open.map((row) => (
              <TicketListCard
                key={row.id}
                ticket={row}
                roomLabel={row.roomId === null ? null : (labels.get(row.roomId) ?? null)}
                detailHref={`/maintenance/${row.id}`}
                testIdPrefix="maintenance"
              />
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Request history" className="flex min-w-0 flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          History ({history.length})
        </h2>
        {history.length === 0 ? (
          <p data-testid="maintenance-history-empty" className="text-sm text-muted-foreground">
            Closed requests will appear here.
          </p>
        ) : (
          <ul data-testid="maintenance-history-list" className="flex min-w-0 flex-col gap-3">
            {history.map((row) => (
              <TicketListCard
                key={row.id}
                ticket={row}
                roomLabel={row.roomId === null ? null : (labels.get(row.roomId) ?? null)}
                detailHref={`/maintenance/${row.id}`}
                testIdPrefix="maintenance"
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
