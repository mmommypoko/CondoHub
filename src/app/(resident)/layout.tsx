import 'server-only';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge } from '@/shared/ui';
import {
  getActiveResidentRooms,
  getCurrentOwners,
} from '@/modules/property-membership/application/index';
import { countUnresolvedTurnoverReviews } from '@/modules/billing-payments/application/index';
import { findRoomById } from '@/modules/property-membership/infrastructure/structureRepository';
import { findBuildingById } from '@/modules/property-membership/infrastructure/structureRepository';
import { getSenderProfile } from '@/modules/identity-access/application/index';
import { db } from '@/shared/db/client';
import { RoomSwitcher, type RoomSwitcherRoom } from '@/modules/property-membership/ui/RoomSwitcher';
import { ResidentSidebar } from '@/modules/property-membership/ui/ResidentSidebar';
import { ResidentBottomNav } from '@/modules/property-membership/ui/ResidentBottomNav';
import { TopBar } from '@/modules/property-membership/ui/TopBar';

export default async function ResidentLayout({ children }: { children: ReactNode }) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/rooms');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/rooms');
  const now = systemClock.now();
  const roomIds = await getActiveResidentRooms(actor.userId, now);
  const rooms: RoomSwitcherRoom[] = [];
  for (const roomId of roomIds) {
    const room = await findRoomById(db, roomId);
    if (room === null) continue;
    const building = await findBuildingById(db, room.buildingId);
    rooms.push({
      id: room.id,
      roomCode: room.roomCode,
      buildingCode: building?.code ?? 'Building',
    });
  }
  const jar = await cookies();
  const lastRoomId = jar.get('lastRoomId')?.value ?? null;
  const currentRoomId = lastRoomId !== null && rooms.some((room) => room.id === lastRoomId) ? lastRoomId : null;
  let roleLabel = 'Resident';
  if (actor.isSystemAdmin) {
    roleLabel = 'System Admin';
  } else if (currentRoomId !== null) {
    const owners = await getCurrentOwners(currentRoomId, now);
    roleLabel = owners.some((owner) => owner.userId === actor.userId) ? 'Owner' : 'Resident';
  }
  let turnoverUnresolved = 0;
  try {
    turnoverUnresolved = await countUnresolvedTurnoverReviews(actor);
  } catch {
    turnoverUnresolved = 0;
  }
  let username = 'Account';
  try {
    const profile = await getSenderProfile(actor.userId);
    username = profile.name;
  } catch {
    username = 'Account';
  }
  return (
    <div className="flex min-h-screen bg-background">
      <ResidentSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          roleLabel={roleLabel}
          username={username}
          brandHref="/rooms"
          context={
            <div className="flex min-w-0 items-center gap-3">
              <Badge data-testid="role-label" variant="neutral">
                {roleLabel}
              </Badge>
              <RoomSwitcher rooms={rooms} currentRoomId={currentRoomId} />
            </div>
          }
        />
        {actor.isSystemAdmin ? (
          <div
            data-testid="admin-return-banner"
            className="shrink-0 border-b border-border bg-surface px-4 py-2 sm:px-6"
          >
            <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-muted-foreground">Viewing resident workspace as System Admin.</span>
              <Link
                data-testid="admin-return-link"
                href="/admin/buildings"
                className="inline-flex items-center gap-1 rounded-lg font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Back to Administration
              </Link>
            </div>
          </div>
        ) : null}
        {turnoverUnresolved > 0 ? (
          <nav
            aria-label="Billing attention"
            className="shrink-0 border-b border-border bg-surface px-4 py-2 sm:px-6"
          >
            <div className="mx-auto w-full max-w-5xl">
              <Link
                data-testid="nav-turnover-reviews-badge"
                href="/invoices/turnover-reviews?state=UNRESOLVED"
                className="inline-flex min-w-0 items-center gap-2 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Badge data-testid="turnover-unresolved-badge" variant="warning">
                  {turnoverUnresolved} unresolved turnover{' '}
                  {turnoverUnresolved === 1 ? 'review' : 'reviews'}
                </Badge>
              </Link>
            </div>
          </nav>
        ) : null}
        <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>
        <ResidentBottomNav />
      </div>
    </div>
  );
}
