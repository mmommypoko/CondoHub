import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { getAdminJobRun } from '@/modules/billing-payments/application/index';
import { isUuid } from '@/shared/utils/idempotency';
import { JobRunDetailCard } from '@/modules/billing-payments/ui/JobRunDetailCard';

export const dynamic = 'force-dynamic';

export default async function AdminBillingJobRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/billing/job-runs');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { id } = await params;
  if (!isUuid(id)) redirect('/admin/billing/job-runs');
  const detail = await getAdminJobRun(actor, id);
  if (detail === null) redirect('/admin/billing/job-runs');
  return (
    <main
      data-testid="job-run-detail-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <Link
        data-testid="job-run-detail-back"
        href="/admin/billing/job-runs"
        className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to job runs
      </Link>
      <JobRunDetailCard run={detail} />
    </main>
  );
}
