import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
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
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Facilities</h1>
        <p className="text-sm text-muted-foreground">
          Pick a facility to see open slots, quota, and your room bookings.
        </p>
      </div>
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
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`facilities-row-${row.id}`}
                  href={`/facilities/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
                >
                  {row.name}
                </Link>
                <Badge variant="neutral">{row.capacity} {row.capacity === 1 ? 'seat' : 'seats'}</Badge>
              </div>
              {row.description !== null && row.description !== '' ? (
                <p className="line-clamp-3 break-words text-sm text-muted-foreground">{row.description}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">Code {row.code}</p>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Facility pages"
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            Page {page} of {totalPages} ({feed.total} facilities)
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                data-testid="facilities-prev"
                href={`/facilities?page=${page - 1}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                data-testid="facilities-next"
                href={`/facilities?page=${page + 1}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
