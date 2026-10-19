import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { PageHeader } from '@/shared/ui';
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
      <PageHeader
        title="New announcement"
        description="Write the update, attach up to 5 images, then save as draft, publish now, or schedule."
        backHref="/admin/announcements"
        backLabel="Back to announcements"
        backTestId="admin-announcement-new-back"
      />
      <AnnouncementCreateForm />
    </main>
  );
}
