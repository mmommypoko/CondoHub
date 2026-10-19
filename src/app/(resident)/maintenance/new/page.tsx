import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { PageHeader } from '@/shared/ui';
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
      <PageHeader
        title="New request"
        description="Describe the problem and where it is, attach up to 5 photos. Common-area reports skip the room picker."
        backHref="/maintenance"
        backLabel="Back to Maintenance"
        backTestId="maintenance-new-back"
      />
      <TicketCreateForm privateRooms={privateRooms} managedRooms={managedRooms} />
    </main>
  );
}
