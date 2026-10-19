import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { ACTION_LINK_CLASS, Badge, DataTable, DataTableCell, DataTableRow, EmptyState, PageHeader } from '@/shared/ui';
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
        <DataTable
          testId="admin-buildings-list"
          caption="Buildings"
          columns={[
            { key: 'name', header: 'Building' },
            { key: 'status', header: 'Status' },
          ]}
        >
          {buildings.map((building) => (
            <DataTableRow key={building.id} rowKey={building.id}>
              <DataTableCell link href={`/admin/buildings/${building.id}`} linkTestId={`admin-buildings-row-${building.id}`}>
                {building.name} · {building.code}
              </DataTableCell>
              <DataTableCell>
                <Badge variant={building.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {building.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </Badge>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      )}
    </main>
  );
}
