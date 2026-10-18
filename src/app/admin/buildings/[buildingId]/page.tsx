import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { listBuildingStructures } from '@/modules/property-membership/application/index';

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">
            {structures.building.name} · {structures.building.code}
          </h1>
          <p className="text-sm text-muted-foreground">
            {structures.floors.length} floors · {structures.rooms.length} rooms
          </p>
        </div>
        <Badge variant={structures.building.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {structures.building.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <section className="flex flex-col gap-2" aria-label="Floors">
        <h2 className="text-sm font-semibold text-foreground">Floors</h2>
        {structures.floors.length === 0 ? (
          <p data-testid="admin-floors-empty" className="text-sm text-muted-foreground">
            No floors recorded.
          </p>
        ) : (
          <ul data-testid="admin-floors-list" className="flex flex-col gap-2">
            {structures.floors.map((floor) => (
              <li
                key={floor.id}
                className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground"
              >
                {floor.label} · {floor.code}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2" aria-label="Rooms">
        <h2 className="text-sm font-semibold text-foreground">Rooms</h2>
        {structures.rooms.length === 0 ? (
          <EmptyState
            data-testid="admin-rooms-empty"
            title="No rooms yet"
            description="Rooms in this building will appear here."
          />
        ) : (
          <ul data-testid="admin-rooms-list" className="flex flex-col gap-2">
            {structures.rooms.map((room) => (
              <li
                key={room.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span className="min-w-0 break-words text-foreground">
                  {room.roomCode} · {room.areaSqm} sqm
                </span>
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Link
                    data-testid={`admin-rooms-chat-${room.id}`}
                    href={`/admin/rooms/${room.id}/chat`}
                    className="inline-flex items-center gap-1 rounded-lg border border-input-border bg-surface px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <MessageCircle aria-hidden="true" className="size-3" />
                    Chat
                  </Link>
                  <Badge variant={room.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {room.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
