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

function tenancyPeriodLabel(startsAt: Date, endsAt: Date | null): string {
  const end = endsAt === null ? 'present' : formatDay(endsAt);
  return `${formatDay(startsAt)} to ${end}`;
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
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
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
            <label htmlFor="admin-ownership-room" className="text-body leading-body font-medium text-foreground">
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
          <p data-testid="admin-ownership-room" className="text-small leading-small text-muted-foreground">
            {selectedRoom === null ? 'Selected room' : selectedRoom.label}
          </p>
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-5" aria-label="Current state">
            <h2 className="text-heading leading-heading font-semibold text-foreground">Current state</h2>
            <div className="flex flex-col gap-2">
              <h3 className="text-body leading-body font-semibold text-foreground">Current owners</h3>
              {owners.length === 0 ? (
                <p data-testid="admin-owners-empty" className="text-small leading-small text-muted-foreground">
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
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-body leading-body font-semibold text-foreground">Tenancies</h3>
              {tenancies.length === 0 ? (
                <p data-testid="admin-tenancies-empty" className="text-small leading-small text-muted-foreground">
                  No tenancies recorded. Start the first rental period in Manage this room below.
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
                        {tenancyPeriodLabel(tenancy.startsAt, tenancy.endsAt)}
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
            </div>
          </section>
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-5" aria-label="Manage this room">
            <h2 className="text-heading leading-heading font-semibold text-foreground">Manage this room</h2>
            <div className="flex flex-col gap-2">
              <h3 className="text-body leading-body font-semibold text-foreground">New tenancy</h3>
              <TenancyCreateForm roomId={selectedRoomId} allowProjectManaged />
            </div>
            {owners.length > 0 ? (
              <div className="border-t border-border pt-4">
                <OwnershipManageForm
                  roomId={selectedRoomId}
                  owners={owners.map((owner) => ({
                    ownershipId: owner.ownershipId,
                    userId: owner.userId,
                    name: ownerNames.get(owner.userId) ?? owner.userId,
                  }))}
                />
              </div>
            ) : null}
            <div className="border-t border-border pt-4">
              <OwnershipAssignForm roomId={selectedRoomId} />
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
