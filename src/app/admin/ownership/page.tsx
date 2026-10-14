import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  getCurrentOwners,
  listAllBuildings,
  listBuildingStructures,
  listRoomTenancies,
} from '@/modules/property-membership/application/index';

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
  const owners = selectedRoomId === null ? [] : await getCurrentOwners(selectedRoomId, now);
  const tenancies = selectedRoomId === null ? [] : await listRoomTenancies(selectedRoomId);
  return (
    <main
      data-testid="admin-ownership-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Ownership and tenancy</h1>
        <p className="text-sm text-muted-foreground">
          Review current owners and rental periods before transfer, removal, or correction.
        </p>
      </div>
      {roomOptions.length === 0 ? (
        <EmptyState
          data-testid="admin-ownership-empty"
          title="No rooms yet"
          description="Create buildings and rooms before managing ownership."
        />
      ) : (
        <form data-testid="admin-ownership-picker" method="get" className="flex flex-wrap items-center gap-2">
          <label htmlFor="admin-ownership-room" className="shrink-0 text-sm font-medium text-foreground">
            Room
          </label>
          <select
            id="admin-ownership-room"
            name="roomId"
            defaultValue={selectedRoomId ?? ''}
            className="h-10 min-w-0 flex-1 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground sm:flex-none"
          >
            <option value="">Select a room</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
          <button
            data-testid="admin-ownership-view"
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            View
          </button>
        </form>
      )}
      {selectedRoomId !== null ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2" aria-label="Current owners">
            <h2 className="text-sm font-semibold text-foreground">Current owners</h2>
            {owners.length === 0 ? (
              <p data-testid="admin-owners-empty" className="text-sm text-muted-foreground">
                No current owners recorded.
              </p>
            ) : (
              <ul data-testid="admin-owners-list" className="flex flex-col gap-2">
                {owners.map((owner) => (
                  <li
                    key={owner.ownershipId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
                  >
                    <span className="truncate text-foreground">{owner.userId}</span>
                    <Badge variant="info">since {owner.startAt.toISOString().slice(0, 10)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-2" aria-label="Tenancies">
            <h2 className="text-sm font-semibold text-foreground">Tenancies</h2>
            {tenancies.length === 0 ? (
              <p data-testid="admin-tenancies-empty" className="text-sm text-muted-foreground">
                No tenancies recorded.
              </p>
            ) : (
              <ul data-testid="admin-tenancies-list" className="flex flex-col gap-2">
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
        </div>
      ) : null}
    </main>
  );
}
