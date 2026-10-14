import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { resolveActorRooms } from '@/modules/property-membership/application/index';
import { findBuildingById } from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';

export default async function MyRoomsPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/rooms');
  if (actor.mustChangePassword) redirect('/change-password');
  const rooms = await resolveActorRooms(actor, systemClock.now());
  return (
    <main data-testid="my-rooms-page" className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">My Rooms</h1>
        <p className="text-sm text-muted-foreground">
          Rooms where you hold an active membership or ownership.
        </p>
      </div>
      {rooms.length === 0 ? (
        <EmptyState
          data-testid="my-rooms-empty"
          title="No rooms yet"
          description="When you join or own a room, it will appear here."
        />
      ) : (
        <ul data-testid="my-rooms-list" className="flex flex-col gap-3">
          {await Promise.all(
            rooms.map(async (room) => {
              const building = await findBuildingById(db, room.buildingId);
              return (
                <li
                  key={room.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      data-testid={`my-rooms-row-${room.id}`}
                      href={`/rooms/${room.id}`}
                      className="truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {building?.name ?? 'Building'} · {room.roomCode}
                    </Link>
                    <p className="text-sm text-muted-foreground">Area {room.areaSqm} sqm</p>
                  </div>
                  <Badge variant={room.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {room.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Badge>
                </li>
              );
            }),
          )}
        </ul>
      )}
    </main>
  );
}
