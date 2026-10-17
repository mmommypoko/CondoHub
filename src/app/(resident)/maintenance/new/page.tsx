import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { listEligibleRooms } from '@/modules/maintenance/application/index';
import {
  TicketCreateForm,
  type TicketRoomOption,
} from '@/modules/maintenance/ui/TicketCreateForm';
import {
  findBuildingById,
  findRoomById,
} from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';

export const dynamic = 'force-dynamic';

async function toOptions(roomIds: string[]): Promise<TicketRoomOption[]> {
  const options: TicketRoomOption[] = [];
  for (const roomId of roomIds) {
    const room = await findRoomById(db, roomId);
    if (room === null) continue;
    const building = await findBuildingById(db, room.buildingId);
    options.push({
      id: room.id,
      label: `${building?.code ?? 'Building'} · ${room.roomCode}`,
    });
  }
  return options.sort((left, right) => left.label.localeCompare(right.label));
}

export default async function MaintenanceNewPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/maintenance/new');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/maintenance/new');
  const now = systemClock.now();
  const [privateRooms, managedRooms] = await Promise.all([
    listEligibleRooms(actor, 'PRIVATE_OWNER', now).then((dto) => toOptions(dto.roomIds)),
    listEligibleRooms(actor, 'PROJECT_MANAGED_PRIVATE', now).then((dto) => toOptions(dto.roomIds)),
  ]);
  return (
    <main
      data-testid="maintenance-new-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <Link
        data-testid="maintenance-new-back"
        href="/maintenance"
        className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to requests
      </Link>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">New request</h1>
        <p className="text-sm text-muted-foreground">
          Describe the problem and attach up to 5 photos. Common-area requests skip the room
          picker.
        </p>
      </div>
      <TicketCreateForm privateRooms={privateRooms} managedRooms={managedRooms} />
    </main>
  );
}
