import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge, EmptyState, PageHeader, Pagination } from '@/shared/ui';
import { listFacilityPage } from '@/modules/facility-booking/application/index';

export default async function ResidentFacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/facilities');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/facilities');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const feed = await listFacilityPage(actor, { status: 'ACTIVE', page, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  return (
    <main data-testid="facilities-page" className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Facilities"
        description="Pick a facility to see open slots, quota, and your room bookings."
      />
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="facilities-empty"
          icon={CalendarDays}
          title="No facilities open"
          description="When the management team opens a facility for booking, it will appear here."
        />
      ) : (
        <ul data-testid="facilities-list" className="flex flex-col gap-3">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`facilities-row-${row.id}`}
                  href={`/facilities/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words rounded-md text-body font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {row.name}
                </Link>
                <Badge variant="neutral">{row.capacity} {row.capacity === 1 ? 'seat' : 'seats'}</Badge>
              </div>
              {row.description !== null && row.description !== '' ? (
                <p className="line-clamp-3 break-words text-small leading-small text-muted-foreground">{row.description}</p>
              ) : null}
              <p className="text-small ui-tabular text-muted-foreground">Code {row.code}</p>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={feed.total}
        pagePath="/facilities"
        testId="facilities-pages"
        nextTestId="facilities-next"
        prevTestId="facilities-prev"
        hideDisabledEnds
      />
    </main>
  );
}
