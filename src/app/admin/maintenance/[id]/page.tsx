import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { EmptyState } from '@/shared/ui';
import { isUuid } from '@/shared/utils/idempotency';
import { getTicket } from '@/modules/maintenance/application/index';
import { TicketDetailSections } from '@/modules/maintenance/ui/TicketDetailSections';
import { isTerminalTicketStatus } from '@/modules/maintenance/ui/ticketLabels';
import {
  findBuildingById,
  findRoomById,
} from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminMaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/maintenance');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { id } = await params;
  if (!isUuid(id)) redirect('/admin/maintenance');
  const ticket = await getTicket(actor, id);
  if (ticket === null) {
    return (
      <main data-testid="admin-maintenance-detail-page" className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <EmptyState
          data-testid="admin-maintenance-detail-missing"
          title="Request not available"
          description="This request does not exist or is not routed to the management team."
          action={
            <Link
              data-testid="admin-maintenance-detail-back"
              href="/admin/maintenance"
              className="inline-flex items-center gap-1 text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to inbox
            </Link>
          }
        />
      </main>
    );
  }
  let roomLabel: string | null = null;
  if (ticket.roomId !== null) {
    const room = await findRoomById(db, ticket.roomId);
    if (room === null) {
      roomLabel = 'Room unavailable';
    } else {
      const building = await findBuildingById(db, room.buildingId);
      roomLabel = `${building?.code ?? 'Building'} · ${room.roomCode}`;
    }
  }
  return (
    <main
      data-testid="admin-maintenance-detail-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <Link
        data-testid="admin-maintenance-detail-back"
        href="/admin/maintenance"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to inbox
      </Link>
      <TicketDetailSections
        ticket={ticket}
        roomLabel={roomLabel}
        testIdPrefix="admin-maintenance-detail"
        transitionMode={isTerminalTicketStatus(ticket.status) ? 'none' : 'handler'}
      />
    </main>
  );
}
