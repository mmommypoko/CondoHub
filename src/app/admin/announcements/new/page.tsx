import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { AnnouncementCreateForm } from '@/modules/announcements/ui/AnnouncementCreateForm';

export default async function AdminAnnouncementNewPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/announcements/new');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  return (
    <main
      data-testid="admin-announcement-new-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">New announcement</h1>
        <p className="text-sm text-muted-foreground">
          Write the update, attach up to 5 images, then save as draft, publish now, or schedule.
        </p>
      </div>
      <AnnouncementCreateForm />
    </main>
  );
}
