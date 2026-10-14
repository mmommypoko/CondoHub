import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { listAllBuildings } from '@/modules/property-membership/application/index';

export default async function AdminBuildingsPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/buildings');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const buildings = await listAllBuildings(actor);
  return (
    <main
      data-testid="admin-buildings-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Buildings</h1>
        <p className="text-sm text-muted-foreground">
          Manage buildings, floors, rooms, and room status.
        </p>
      </div>
      {buildings.length === 0 ? (
        <EmptyState
          data-testid="admin-buildings-empty"
          title="No buildings yet"
          description="Create the first building to start onboarding rooms."
        />
      ) : (
        <ul data-testid="admin-buildings-list" className="flex flex-col gap-3">
          {buildings.map((building) => (
            <li
              key={building.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  data-testid={`admin-buildings-row-${building.id}`}
                  href={`/admin/buildings/${building.id}`}
                  className="truncate text-sm font-semibold text-foreground hover:underline"
                >
                  {building.name} · {building.code}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{building.id}</p>
              </div>
              <Badge variant={building.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {building.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
