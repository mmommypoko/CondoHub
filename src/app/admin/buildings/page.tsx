import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { ACTION_LINK_CLASS, Badge, EmptyState, PageHeader } from '@/shared/ui';
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
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title="Buildings"
        description="Manage buildings, floors, rooms, and room status."
        actions={
          <Link
            data-testid="admin-buildings-create"
            href="/admin/buildings/new"
            className={ACTION_LINK_CLASS}
          >
            <Plus aria-hidden="true" className="size-4" />
            New building
          </Link>
        }
      />
      {buildings.length === 0 ? (
        <EmptyState
          data-testid="admin-buildings-empty"
          title="No buildings yet"
          description="Create the first building to start onboarding rooms."
        />
      ) : (
        <ul data-testid="admin-buildings-list" aria-label="Buildings" className="flex min-w-0 flex-col gap-3">
          {buildings.map((building) => (
            <li
              key={building.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  data-testid={`admin-buildings-row-${building.id}`}
                  href={`/admin/buildings/${building.id}`}
                  className="inline-flex min-w-0 items-center gap-1 break-words text-body leading-body font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span className="min-w-0 truncate">
                    {building.name} · {building.code}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
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
