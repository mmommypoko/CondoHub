import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays, MessageCircle } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { ACTION_LINK_CLASS, ACTION_LINK_SECONDARY_CLASS, Badge, EmptyState } from '@/shared/ui';
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
import { RoomMemberAddForm } from '@/modules/property-membership/ui/RoomMemberAddForm';
import { EndMembershipButton } from '@/modules/property-membership/ui/EndMembershipButton';
import { TenancyCreateForm } from '@/modules/property-membership/ui/TenancyCreateForm';
import { TenancyEndButton } from '@/modules/property-membership/ui/TenancyEndButton';
import { getSenderProfile } from '@/modules/identity-access/application/index';
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
      <main
        data-testid="room-detail-page"
        className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6"
      >
        <EmptyState
          data-testid="room-detail-forbidden"
          title="Room not available"
          description="You do not have access to this room, or it does not exist."
        />
      </main>
    );
  }
  const manageVerdict = await canActInRoom(actor.userId, roomId, 'MANAGE_MEMBERS', now).catch(
    () => null,
  );
  const canManageMembers =
    actor.isSystemAdmin || (manageVerdict !== null && manageVerdict.allowed);
  const room = await findRoomById(db, roomId);
  if (room === null) redirect('/rooms');
  const building = await findBuildingById(db, room.buildingId);
  const [owners, memberships, tenancies] = await Promise.all([
    getCurrentOwners(room.id, now),
    listRoomMemberships(room.id),
    listRoomTenancies(room.id),
  ]);
  const activeTenancies = tenancies.filter((tenancy) => tenancy.state === 'ACTIVE');
  const isRoomOwner = owners.some((owner) => owner.userId === actor.userId);
  const canManageTenancies = actor.isSystemAdmin || isRoomOwner;
  const memberNames = new Map<string, string>();
  for (const entry of [...owners, ...memberships]) {
    if (memberNames.has(entry.userId)) continue;
    try {
      const profile = await getSenderProfile(entry.userId);
      memberNames.set(entry.userId, profile.name);
    } catch {
      memberNames.set(entry.userId, entry.userId);
    }
  }
  return (
    <main
      data-testid="room-detail-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6"
    >
      <div className="flex flex-col gap-3">
        <Link
          data-testid="room-detail-back"
          href="/rooms"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          My Rooms
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1
              data-testid="room-detail-title"
              className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              {building?.name ?? 'Building'} · {room.roomCode}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">Area {room.areaSqm} sqm</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              data-testid="room-detail-bookings-link"
              href={`/rooms/${room.id}/bookings`}
              className={ACTION_LINK_SECONDARY_CLASS}
            >
              <CalendarDays aria-hidden="true" className="size-4" />
              View bookings
            </Link>
            <Link
              data-testid="room-detail-facilities-link"
              href="/facilities"
              className={ACTION_LINK_SECONDARY_CLASS}
            >
              Browse facilities
            </Link>
            <Link
              data-testid="room-detail-chat-link"
              href={`/rooms/${room.id}/chat`}
              className={ACTION_LINK_CLASS}
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              Open room chat
            </Link>
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-3" aria-label="Owners">
        <h2 className="text-sm font-semibold text-foreground">Current owners</h2>
        {owners.length === 0 ? (
          <p data-testid="room-owners-empty" className="text-sm leading-6 text-muted-foreground">
            No current owners recorded.
          </p>
        ) : (
          <ul data-testid="room-owners-list" className="flex flex-wrap gap-2">
            {owners.map((owner) => (
              <li key={owner.ownershipId}>
                <Badge variant="info">{memberNames.get(owner.userId) ?? owner.userId}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3" aria-label="Memberships">
        <h2 className="text-sm font-semibold text-foreground">
          Memberships ({memberships.length})
        </h2>
        {memberships.length === 0 ? (
          <p data-testid="room-memberships-empty" className="text-sm leading-6 text-muted-foreground">
            No memberships recorded.
          </p>
        ) : (
          <ul
            data-testid="room-memberships-list"
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            {memberships.map((membership, index) => (
              <li
                key={membership.id}
                className={
                  index === memberships.length - 1
                    ? 'flex items-center justify-between gap-3 px-4 py-3 text-sm'
                    : 'flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm'
                }
              >
                <span className="min-w-0 truncate text-foreground">{memberNames.get(membership.userId) ?? membership.userId}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant={membership.endAt === null ? 'success' : 'neutral'}>
                    {membership.memberRole}
                    {membership.endAt === null ? '' : ' · ended'}
                  </Badge>
                  {canManageMembers && membership.endAt === null ? (
                    <EndMembershipButton roomId={room.id} membershipId={membership.id} />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {canManageMembers ? (
        <section className="flex flex-col gap-3" aria-label="Add member">
          <h2 className="text-sm font-semibold text-foreground">Add member</h2>
          <RoomMemberAddForm
            roomId={room.id}
            activeTenancies={activeTenancies.map((tenancy) => ({
              id: tenancy.id,
              managementMode: tenancy.managementMode,
            }))}
          />
        </section>
      ) : null}
      <section className="flex flex-col gap-3" aria-label="Tenancies">
        <h2 className="text-sm font-semibold text-foreground">Tenancies ({tenancies.length})</h2>
        {tenancies.length === 0 ? (
          <p data-testid="room-tenancies-empty" className="text-sm leading-6 text-muted-foreground">
            No tenancies recorded.
          </p>
        ) : (
          <ul
            data-testid="room-tenancies-list"
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            {tenancies.map((tenancy, index) => (
              <li
                key={tenancy.id}
                className={
                  index === tenancies.length - 1
                    ? 'flex items-center justify-between gap-3 px-4 py-3 text-sm'
                    : 'flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm'
                }
              >
                <span className="min-w-0 truncate text-foreground">{tenancy.managementMode}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant={tenancy.state === 'ACTIVE' ? 'success' : 'neutral'}>
                    {tenancy.state}
                  </Badge>
                  {tenancy.state === 'ACTIVE' &&
                  (actor.isSystemAdmin ||
                    (isRoomOwner && tenancy.managementMode === 'PRIVATE_OWNER_MANAGED')) ? (
                    <TenancyEndButton roomId={room.id} tenancyId={tenancy.id} />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {canManageTenancies ? (
        <section className="flex flex-col gap-3" aria-label="New tenancy">
          <h2 className="text-sm font-semibold text-foreground">New tenancy</h2>
          <TenancyCreateForm roomId={room.id} allowProjectManaged={actor.isSystemAdmin} />
        </section>
      ) : null}
    </main>
  );
}
