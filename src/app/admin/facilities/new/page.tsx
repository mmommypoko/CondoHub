import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { listAllBuildings } from '@/modules/property-membership/application/index';
import { FacilityCreateForm } from '@/modules/facility-booking/ui/FacilityCreateForm';

export default async function AdminFacilityNewPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/facilities/new');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const buildings = await listAllBuildings(actor);
  const projectId = buildings[0]?.projectId ?? '00000000-0000-4000-8000-000000000000';
  return (
    <main
      data-testid="admin-facility-new-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">New facility</h1>
        <p className="text-sm text-muted-foreground">
          Set the code, opening hours, slot length, seats, quota, and advance window.
        </p>
      </div>
      <FacilityCreateForm projectId={projectId} />
    </main>
  );
}
