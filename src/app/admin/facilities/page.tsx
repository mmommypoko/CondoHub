import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { ACTION_LINK_CLASS, Badge, EmptyState, PageHeader, Pagination } from '@/shared/ui';
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
      <PageHeader
        title="Facilities"
        description="Create facilities, manage opening hours, closures, quota, and future configs."
        actions={
          <Link
            data-testid="admin-facilities-create"
            href="/admin/facilities/new"
            className={ACTION_LINK_CLASS}
          >
            <Plus aria-hidden="true" className="size-4" />
            New facility
          </Link>
        }
      />
      {feed.rows.length === 0 ? (
        <EmptyState
          data-testid="admin-facilities-empty"
          title="No facilities yet"
          description="Create the first facility to open booking for residents."
        />
      ) : (
        <ul data-testid="admin-facilities-list" className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {feed.rows.map((row) => (
            <li key={row.id} className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`admin-facilities-row-${row.id}`}
                  href={`/admin/facilities/${row.id}`}
                  className="min-w-0 flex-1 basis-40 break-words rounded-md text-body font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {row.name}
                </Link>
                <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
              </div>
              <p className="ui-tabular text-small text-muted-foreground">
                Code {row.code} · {row.capacity} {row.capacity === 1 ? 'seat' : 'seats'}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={feed.total}
        pagePath="/admin/facilities"
        testId="admin-facilities-pages"
        nextTestId="admin-facilities-next"
        prevTestId="admin-facilities-prev"
        hideDisabledEnds
      />
    </main>
  );
}
