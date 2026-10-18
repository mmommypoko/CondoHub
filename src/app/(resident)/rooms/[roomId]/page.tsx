import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  canActInRoom,
  getCurrentOwners,
  listRoomMemberships,
  listRoomTenancies,
} from '@/modules/property-membership/application/index';
import {
  findBuildingById,
  findRoomById,
} from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/rooms');
  if (actor.mustChangePassword) redirect('/change-password');
  const { roomId } = await params;
  const now = systemClock.now();
  const verdict = await canActInRoom(actor.userId, roomId, 'VIEW_ROOM', now).catch(() => null);
  if ((verdict === null || !verdict.allowed) && !actor.isSystemAdmin) {
    return (
      <main data-testid="room-detail-page" className="mx-auto w-full max-w-5xl p-6">
        <EmptyState
          data-testid="room-detail-forbidden"
          title="Room not available"
          description="You do not have access to this room, or it does not exist."
        />
      </main>
    );
  }
  const room = await findRoomById(db, roomId);
  if (room === null) redirect('/rooms');
  const building = await findBuildingById(db, room.buildingId);
  const [owners, memberships, tenancies] = await Promise.all([
    getCurrentOwners(room.id, now),
    listRoomMemberships(room.id),
    listRoomTenancies(room.id),
  ]);
  return (
    <main data-testid="room-detail-page" className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 data-testid="room-detail-title" className="text-xl font-semibold text-foreground">
            {building?.name ?? 'Building'} · {room.roomCode}
          </h1>
          <p className="text-sm text-muted-foreground">Area {room.areaSqm} sqm</p>
        </div>
        <Link
          data-testid="room-detail-chat-link"
          href={`/rooms/${room.id}/chat`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          Open room chat
        </Link>
      </div>
      <section className="flex flex-col gap-2" aria-label="Owners">
        <h2 className="text-sm font-semibold text-foreground">Current owners</h2>
        {owners.length === 0 ? (
          <p data-testid="room-owners-empty" className="text-sm text-muted-foreground">
            No current owners recorded.
          </p>
        ) : (
          <ul data-testid="room-owners-list" className="flex flex-wrap gap-2">
            {owners.map((owner) => (
              <li key={owner.ownershipId}>
                <Badge variant="info">{owner.userId}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2" aria-label="Memberships">
        <h2 className="text-sm font-semibold text-foreground">
          Memberships ({memberships.length})
        </h2>
        {memberships.length === 0 ? (
          <p data-testid="room-memberships-empty" className="text-sm text-muted-foreground">
            No memberships recorded.
          </p>
        ) : (
          <ul data-testid="room-memberships-list" className="flex flex-col gap-2">
            {memberships.map((membership) => (
              <li
                key={membership.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span className="truncate text-foreground">{membership.userId}</span>
                <Badge variant={membership.endAt === null ? 'success' : 'neutral'}>
                  {membership.memberRole}
                  {membership.endAt === null ? '' : ' · ended'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2" aria-label="Tenancies">
        <h2 className="text-sm font-semibold text-foreground">Tenancies ({tenancies.length})</h2>
        {tenancies.length === 0 ? (
          <p data-testid="room-tenancies-empty" className="text-sm text-muted-foreground">
            No tenancies recorded.
          </p>
        ) : (
          <ul data-testid="room-tenancies-list" className="flex flex-col gap-2">
            {tenancies.map((tenancy) => (
              <li
                key={tenancy.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span className="text-foreground">{tenancy.managementMode}</span>
                <Badge variant={tenancy.state === 'ACTIVE' ? 'success' : 'neutral'}>
                  {tenancy.state}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
