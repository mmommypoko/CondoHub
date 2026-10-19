import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge, Button, DataTable, DataTableCell, DataTableRow, EmptyState, INPUT_CLASS, PageHeader } from '@/shared/ui';
import {
  getCurrentOwners,
  listAllBuildings,
  listBuildingStructures,
  listRoomTenancies,
} from '@/modules/property-membership/application/index';
import { getSenderProfile } from '@/modules/identity-access/application/index';
import { OwnershipAssignForm, OwnershipManageForm } from './OwnershipManageForm';
import { TenancyCreateForm } from '@/modules/property-membership/ui/TenancyCreateForm';
import { TenancyEndButton } from '@/modules/property-membership/ui/TenancyEndButton';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatDay(value: Date): string {
  return dayFormatter.format(value);
}

export default async function AdminOwnershipPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/ownership');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const buildings = await listAllBuildings(actor);
  const now = systemClock.now();
  const roomOptions: Array<{ id: string; label: string }> = [];
  for (const building of buildings) {
    const structures = await listBuildingStructures(actor, building.id);
    for (const room of structures.rooms) {
      roomOptions.push({ id: room.id, label: `${building.code} · ${room.roomCode}` });
    }
  }
  const selectedRoomId = params.roomId ?? null;
  const selectedRoom = selectedRoomId === null ? null : roomOptions.find((room) => room.id === selectedRoomId) ?? null;
  const owners = selectedRoomId === null ? [] : await getCurrentOwners(selectedRoomId, now);
  const tenancies = selectedRoomId === null ? [] : await listRoomTenancies(selectedRoomId);
  const ownerNames = new Map<string, string>();
  for (const owner of owners) {
    if (ownerNames.has(owner.userId)) continue;
    try {
      const profile = await getSenderProfile(owner.userId);
      ownerNames.set(owner.userId, profile.name);
    } catch {
      ownerNames.set(owner.userId, owner.userId);
    }
  }
  return (
    <main
      data-testid="admin-ownership-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6"
    >
      <PageHeader
        title="Ownership and tenancy"
        description="Review current owners and rental periods before transfer, removal, or correction."
      />
      {roomOptions.length === 0 ? (
        <EmptyState
          data-testid="admin-ownership-empty"
          title="No rooms yet"
          description="Create buildings and rooms before managing ownership."
        />
      ) : (
        <form data-testid="admin-ownership-picker" method="get" className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xs">
            <label htmlFor="admin-ownership-room" className="text-sm font-medium text-foreground">
              Room
            </label>
            <select
              id="admin-ownership-room"
              name="roomId"
              defaultValue={selectedRoomId ?? ''}
              className={INPUT_CLASS}
            >
              <option value="">Select a room</option>
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label}
                </option>
              ))}
            </select>
          </div>
          <Button data-testid="admin-ownership-view" type="submit">
            View
          </Button>
        </form>
      )}
      {selectedRoomId !== null ? (
        <div className="flex flex-col gap-6">
          <p data-testid="admin-ownership-room" className="text-sm text-muted-foreground">
            {selectedRoom === null ? 'Selected room' : selectedRoom.label}
          </p>
          <section className="flex flex-col gap-2" aria-label="Current owners">
            <h2 className="text-sm font-semibold text-foreground">Current owners</h2>
            {owners.length === 0 ? (
              <p data-testid="admin-owners-empty" className="text-sm text-muted-foreground">
                No current owners recorded.
              </p>
            ) : (
              <DataTable
                testId="admin-owners-list"
                caption="Current owners of the selected room"
                columns={[
                  { key: 'user', header: 'User' },
                  { key: 'since', header: 'Since' },
                ]}
              >
                {owners.map((owner) => (
                  <DataTableRow key={owner.ownershipId} rowKey={owner.ownershipId}>
                    <DataTableCell>{ownerNames.get(owner.userId) ?? owner.userId}</DataTableCell>
                    <DataTableCell>
                      <Badge variant="info">since {formatDay(owner.startAt)}</Badge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>
            )}
          </section>
          <section className="flex flex-col gap-2" aria-label="Tenancies">
            <h2 className="text-sm font-semibold text-foreground">Tenancies</h2>
            {tenancies.length === 0 ? (
              <p data-testid="admin-tenancies-empty" className="text-sm text-muted-foreground">
                No tenancies recorded.
              </p>
            ) : (
              <DataTable
                testId="admin-tenancies-list"
                caption="Rental periods of the selected room"
                columns={[
                  { key: 'mode', header: 'Management' },
                  { key: 'period', header: 'Period' },
                  { key: 'state', header: 'State' },
                  { key: 'actions', header: 'Actions' },
                ]}
              >
                {tenancies.map((tenancy) => (
                  <DataTableRow key={tenancy.id} rowKey={tenancy.id}>
                    <DataTableCell>
                      {tenancy.managementMode === 'PROJECT_MANAGED' ? 'Project managed' : 'Owner managed'}
                    </DataTableCell>
                    <DataTableCell>
                      {formatDay(tenancy.startsAt)} to {tenancy.endsAt === null ? 'present' : formatDay(tenancy.endsAt)}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={tenancy.state === 'ACTIVE' ? 'success' : 'neutral'}>
                        {tenancy.state}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      {tenancy.state === 'ACTIVE' ? (
                        <TenancyEndButton roomId={selectedRoomId} tenancyId={tenancy.id} />
                      ) : null}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>
            )}
          </section>
          <section className="flex flex-col gap-2" aria-label="New tenancy">
            <h2 className="text-sm font-semibold text-foreground">New tenancy</h2>
            <TenancyCreateForm roomId={selectedRoomId} allowProjectManaged />
          </section>
          {owners.length > 0 ? (
            <section className="flex flex-col gap-2" aria-label="Manage ownership">
              <h2 className="text-sm font-semibold text-foreground">Manage ownership</h2>
              <OwnershipManageForm
                roomId={selectedRoomId}
                owners={owners.map((owner) => ({
                  ownershipId: owner.ownershipId,
                  userId: owner.userId,
                  name: ownerNames.get(owner.userId) ?? owner.userId,
                }))}
              />
            </section>
          ) : null}
          <section className="flex flex-col gap-2" aria-label="Assign owner">
            <h2 className="text-sm font-semibold text-foreground">Assign owner</h2>
            <OwnershipAssignForm roomId={selectedRoomId} />
          </section>
        </div>
      ) : null}
    </main>
  );
}
