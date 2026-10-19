import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { EmptyState } from '@/shared/ui';
import { getAnnouncementDetail } from '@/modules/announcements/application/index';
import { AnnouncementEditForm } from '@/modules/announcements/ui/AnnouncementEditForm';
import { AnnouncementImage } from '@/modules/announcements/ui/AnnouncementImage';

export default async function AdminAnnouncementEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/announcements');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { id } = await params;
  const detail = await getAnnouncementDetail(actor, id, systemClock.now());
  if (detail === null) redirect('/admin/announcements');
  return (
    <main
      data-testid="admin-announcement-edit-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <Link
        data-testid="admin-announcement-edit-back"
        href="/admin/announcements"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-body leading-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to announcements
      </Link>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="break-words text-title leading-title font-semibold tracking-tight text-foreground">Edit announcement</h1>
        <p className="mt-1 max-w-2xl text-small leading-small text-muted-foreground">
          Editing after publish bumps the revision and records a snapshot.
        </p>
      </div>
      <AnnouncementEditForm
        announcementId={detail.id}
        initialTitle={detail.title}
        initialBody={detail.body}
        initialPublishAt={detail.publishAt}
        initialHiddenAt={detail.hiddenAt}
        initialImages={detail.images.map((image) => ({
          imageId: image.id,
          byteSize: image.byteSize,
          mime: image.mime,
        }))}
        revisions={detail.revisions}
      />
      {detail.images.length > 0 ? (
        <section className="flex min-w-0 flex-col gap-2 border-t border-border pt-6" aria-label="Current images">
          <h2 className="text-heading leading-heading font-semibold text-foreground">
            Current images ({detail.images.length})
          </h2>
          <div className="flex min-w-0 flex-col gap-3">
            {detail.images.map((image, index) => (
              <AnnouncementImage
                key={image.id}
                imageId={image.id}
                testId={`admin-announcement-edit-image-${index}`}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          data-testid="admin-announcement-edit-no-images"
          title="No images attached"
          description="Use the uploader above to attach up to 5 images."
        />
      )}
    </main>
  );
}
