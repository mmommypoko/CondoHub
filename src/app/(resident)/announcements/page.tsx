import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge, EmptyState, PageHeader, Pagination } from '@/shared/ui';
import { listAnnouncementFeed } from '@/modules/announcements/application/index';

export const revalidate = 60;

function formatDate(value: string | null): string {
  if (value === null) return 'Draft';
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AnnouncementsFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/announcements');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/announcements');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const feed = await listAnnouncementFeed(actor, { page, pageSize: 20 }, systemClock.now());
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  return (
    <main
      data-testid="announcements-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <PageHeader
        title="Announcements"
        description="Project-wide updates from the management team."
      />
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="announcements-empty"
          icon={Megaphone}
          title="No announcements yet"
          description="When the management team publishes an update, it appears here."
        />
      ) : (
        <ul data-testid="announcements-list" className="flex min-w-0 flex-col gap-3">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <Link
                  data-testid={`announcements-row-${row.id}`}
                  href={`/announcements/${row.id}`}
                  className="min-w-0 w-fit break-words text-body leading-body font-semibold text-foreground underline-offset-2 hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {row.title}
                </Link>
                <p className="line-clamp-3 break-words text-small leading-small text-muted-foreground">{row.body}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums text-muted-foreground">
                <span data-testid={`announcements-date-${row.id}`}>{formatDate(row.publishAt)}</span>
                {row.editedAt !== null ? (
                  <Badge data-testid={`announcements-edited-${row.id}`} variant="neutral">
                    Edited
                  </Badge>
                ) : null}
                {row.images.length > 0 ? (
                  <Badge data-testid={`announcements-images-${row.id}`} variant="info">
                    {row.images.length} {row.images.length === 1 ? 'image' : 'images'}
                  </Badge>
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
        pagePath="/announcements"
        testId="announcements-pages"
        nextTestId="announcements-next"
        prevTestId="announcements-prev"
        hideDisabledEnds
      />
    </main>
  );
}
