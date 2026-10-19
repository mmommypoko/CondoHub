import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { ACTION_LINK_CLASS, Badge, EmptyState, PageHeader, Pagination, cx } from '@/shared/ui';
import { listAdminAnnouncements } from '@/modules/announcements/application/index';

function statusVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pending' {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'SCHEDULED') return 'info';
  if (status === 'HIDDEN') return 'danger';
  return 'neutral';
}

function formatDate(value: string | null): string {
  if (value === null) return '—';
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/announcements');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const feed = await listAdminAnnouncements(actor, { page, pageSize: 20 }, systemClock.now());
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  return (
    <main
      data-testid="admin-announcements-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title="Announcements"
        description="Draft, schedule, publish, hide, and edit project-wide announcements."
        actions={
          <Link
            data-testid="admin-announcements-create"
            href="/admin/announcements/new"
            className={cx(ACTION_LINK_CLASS, 'shrink-0')}
          >
            <Plus aria-hidden="true" className="size-4" />
            New announcement
          </Link>
        }
      />
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="admin-announcements-empty"
          title="No announcements yet"
          description="Create the first announcement to inform residents."
        />
      ) : (
        <ul data-testid="admin-announcements-list" className="flex min-w-0 flex-col gap-3">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`admin-announcements-row-${row.id}`}
                  href={`/admin/announcements/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-body leading-body font-semibold text-foreground underline-offset-2 hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {row.title}
                </Link>
                <Badge data-testid={`admin-announcements-status-${row.id}`} variant={statusVariant(row.status)}>
                  {row.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
                <span>Publish: {formatDate(row.publishAt)}</span>
                <span aria-hidden="true">·</span>
                <span>Revision {row.revision}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {row.images.length} {row.images.length === 1 ? 'image' : 'images'}
                </span>
                {row.editedAt !== null ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Edited</span>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={feed.total}
        pagePath="/admin/announcements"
        testId="admin-announcements-pages"
        nextTestId="admin-announcements-next"
        prevTestId="admin-announcements-prev"
        hideDisabledEnds
      />
    </main>
  );
}
