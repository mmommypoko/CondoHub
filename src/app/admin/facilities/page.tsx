import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { listFacilityPage } from '@/modules/facility-booking/application/index';

export default async function AdminFacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/facilities');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const feed = await listFacilityPage(actor, { page, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(feed.total / 20));
  return (
    <main
      data-testid="admin-facilities-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Facilities</h1>
          <p className="text-sm text-muted-foreground">
            Create facilities, manage opening hours, closures, quota, and future configs.
          </p>
        </div>
        <Link
          data-testid="admin-facilities-create"
          href="/admin/facilities/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          New facility
        </Link>
      </div>
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="admin-facilities-empty"
          title="No facilities yet"
          description="Create the first facility to open booking for residents."
        />
      ) : (
        <ul data-testid="admin-facilities-list" className="flex flex-col gap-3">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`admin-facilities-row-${row.id}`}
                  href={`/admin/facilities/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
                >
                  {row.name}
                </Link>
                <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Code {row.code}</span>
                <span>
                  {row.capacity} {row.capacity === 1 ? 'seat' : 'seats'}
                </span>
              </div>
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
                data-testid="admin-facilities-prev"
                href={`/admin/facilities?page=${page - 1}`}
                className="rounded-lg border border-input-border bg-surface px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                data-testid="admin-facilities-next"
                href={`/admin/facilities?page=${page + 1}`}
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
