import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge, EmptyState, PageHeader } from '@/shared/ui';
import { resolveActorRooms } from '@/modules/property-membership/application/index';
import { findBuildingById } from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';

export default async function MyRoomsPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/rooms');
  if (actor.mustChangePassword) redirect('/change-password');
  const rooms = await resolveActorRooms(actor, systemClock.now());
  return (
    <main
      data-testid="my-rooms-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6"
    >
      <PageHeader
        title="Rooms"
        description="Rooms where you hold an active membership or ownership."
      />
      {rooms.length === 0 ? (
        <EmptyState
          data-testid="my-rooms-empty"
          title="No rooms yet"
          description="When you join or own a room, it will appear here."
        />
      ) : (
        <ul
          data-testid="my-rooms-list"
          className="overflow-hidden rounded-lg border border-border bg-surface"
        >
          {await Promise.all(
            rooms.map(async (room, index) => {
              const building = await findBuildingById(db, room.buildingId);
              const last = index === rooms.length - 1;
              return (
                <li key={room.id} className={last ? undefined : 'border-b border-border'}>
                  <Link
                    data-testid={`my-rooms-row-${room.id}`}
                    href={`/rooms/${room.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition-[background-color] duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring motion-reduce:transition-none"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-heading font-semibold text-foreground">
                        {building?.name ?? 'Building'} · {room.roomCode}
                      </span>
                      <span className="text-small text-muted-foreground">Area {room.areaSqm} sqm</span>
                    </div>
                    <Badge variant={room.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {room.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            }),
          )}
        </ul>
      )}
    </main>
  );
}
