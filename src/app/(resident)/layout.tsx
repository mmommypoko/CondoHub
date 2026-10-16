import 'server-only';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge } from '@/shared/ui/Badge';
import {
  getActiveResidentRooms,
  getCurrentOwners,
} from '@/modules/property-membership/application/index';
import { countUnresolvedTurnoverReviews } from '@/modules/billing-payments/application/index';
import { findRoomById } from '@/modules/property-membership/infrastructure/structureRepository';
import { findBuildingById } from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';
import { RoomSwitcher, type RoomSwitcherRoom } from '@/modules/property-membership/ui/RoomSwitcher';

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
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <span className="text-base font-semibold text-foreground">CondoHub</span>
          <Badge data-testid="role-label" variant="neutral">
            {roleLabel}
          </Badge>
        </div>
        <RoomSwitcher rooms={rooms} currentRoomId={currentRoomId} />
      </header>
      {turnoverUnresolved > 0 ? (
        <nav aria-label="Billing attention" className="border-b border-border bg-surface px-4 py-2 sm:px-6">
          <Link
            data-testid="nav-turnover-reviews-badge"
            href="/invoices/turnover-reviews?state=UNRESOLVED"
            className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-link hover:underline"
          >
            <Badge data-testid="turnover-unresolved-badge" variant="warning">
              {turnoverUnresolved} unresolved turnover {turnoverUnresolved === 1 ? 'review' : 'reviews'}
            </Badge>
          </Link>
        </nav>
      ) : null}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
