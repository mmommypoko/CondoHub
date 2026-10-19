import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge, DataTable, DataTableCell, DataTableRow, EmptyState, PageHeader } from '@/shared/ui';
import { listBuildingStructures } from '@/modules/property-membership/application/index';
import { FloorCreateForm } from '@/modules/property-membership/ui/FloorCreateForm';
import { RoomCreateForm } from '@/modules/property-membership/ui/RoomCreateForm';
import { BuildingStatusControl } from '@/modules/property-membership/ui/BuildingStatusControl';
import { FloorRowActions } from '@/modules/property-membership/ui/FloorRowActions';
import { RoomRowActions } from '@/modules/property-membership/ui/RoomRowActions';

export default async function AdminBuildingDetailPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/buildings');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { buildingId } = await params;
  const structures = await listBuildingStructures(actor, buildingId).catch(() => null);
  if (structures === null) redirect('/admin/buildings');
  return (
    <main
      data-testid="admin-building-detail-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6"
    >
      <PageHeader
        title={`${structures.building.name} · ${structures.building.code}`}
        description={`${structures.floors.length} floors · ${structures.rooms.length} rooms`}
        backHref="/admin/buildings"
        backLabel="Back to buildings"
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={structures.building.status === 'ACTIVE' ? 'success' : 'neutral'}>
              {structures.building.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
            <BuildingStatusControl
              buildingId={structures.building.id}
              status={structures.building.status}
            />
          </span>
        }
      />
      <section className="flex flex-col gap-2" aria-label="Floors">
        <h2 className="text-heading leading-heading font-semibold text-foreground">Floors</h2>
        {structures.floors.length === 0 ? (
          <p data-testid="admin-floors-empty" className="text-small leading-small text-muted-foreground">
            No floors recorded. Add the first floor below.
          </p>
        ) : (
          <ul data-testid="admin-floors-list" aria-label="Floors in this building" className="flex min-w-0 flex-col gap-2">
            {structures.floors.map((floor) => (
              <li
                key={floor.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 break-words text-body leading-body font-medium text-foreground">
                  {floor.label} · {floor.code}
                </span>
                <FloorRowActions
                  floorId={floor.id}
                  code={floor.code}
                  label={floor.label}
                  roomCount={
                    structures.rooms.filter((room) => room.floorId === floor.id).length
                  }
                />
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="text-body leading-body font-semibold text-foreground">New floor</h3>
          <FloorCreateForm buildingId={structures.building.id} />
        </div>
      </section>
      <section className="flex flex-col gap-2" aria-label="Rooms">
        <h2 className="text-heading leading-heading font-semibold text-foreground">Rooms</h2>
        {structures.rooms.length === 0 ? (
          <EmptyState
            data-testid="admin-rooms-empty"
            title="No rooms yet"
            description="Add the first room with the form below."
          />
        ) : (
          <DataTable
            testId="admin-rooms-list"
            caption="Rooms in this building"
            columns={[
              { key: 'room', header: 'Room' },
              { key: 'chat', header: 'Chat' },
              { key: 'status', header: 'Status' },
              { key: 'actions', header: 'Actions' },
            ]}
          >
            {structures.rooms.map((room) => (
              <DataTableRow key={room.id} rowKey={room.id}>
                <DataTableCell>
                  {room.roomCode} · {room.areaSqm} sqm
                </DataTableCell>
                <DataTableCell>
                  <Link
                    data-testid={`admin-rooms-chat-${room.id}`}
                    href={`/admin/rooms/${room.id}/chat`}
                    className="inline-flex items-center gap-1 rounded-md border border-input-border bg-surface px-2 py-1 text-xs font-medium text-body-secondary transition-[background-color,color] duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                  >
                    <MessageCircle aria-hidden="true" className="size-3" />
                    Chat
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <Badge variant={room.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {room.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Badge>
                </DataTableCell>
                <DataTableCell>
                  <RoomRowActions roomId={room.id} areaSqm={room.areaSqm} status={room.status} />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="text-body leading-body font-semibold text-foreground">New room</h3>
          <RoomCreateForm
            buildingId={structures.building.id}
            floors={structures.floors.map((floor) => ({
              id: floor.id,
              code: floor.code,
              label: floor.label,
            }))}
          />
        </div>
      </section>
    </main>
  );
}
