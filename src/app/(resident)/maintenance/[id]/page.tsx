import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { EmptyState } from '@/shared/ui';
import { isUuid } from '@/shared/utils/idempotency';
import { getTicket } from '@/modules/maintenance/application/index';
import { TicketDetailSections } from '@/modules/maintenance/ui/TicketDetailSections';
import type { TicketTransitionAction } from '@/modules/maintenance/ui/TicketTransitionForm';
import { isTerminalTicketStatus } from '@/modules/maintenance/ui/ticketLabels';
import {
  findBuildingById,
  findRoomById,
} from '@/modules/property-membership/infrastructure/structureRepository';
import { isTicketRecipient } from '@/modules/maintenance/infrastructure/ticketRepository';
import { db } from '@/shared/db/client';

export const dynamic = 'force-dynamic';

function reporterTransitionMode(
  status: string,
  isReporter: boolean,
  isRecipient: boolean,
): TicketTransitionAction | 'none' {
  if (isTerminalTicketStatus(status)) return 'none';
  if (isRecipient) return 'handler';
  if (!isReporter) return 'none';
  if (status === 'PENDING' || status === 'WAITING_FOR_INFO') return 'reporter-cancel';
  return 'none';
}

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/maintenance');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/maintenance');
  const { id } = await params;
  if (!isUuid(id)) redirect('/maintenance');
  const ticket = await getTicket(actor, id);
  if (ticket === null) {
    return (
      <main data-testid="maintenance-detail-page" className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <EmptyState
          data-testid="maintenance-detail-missing"
          title="Request not available"
          description="This request does not exist or you do not have access to it."
          action={
            <Link
              data-testid="maintenance-detail-back"
              href="/maintenance"
              className="inline-flex items-center gap-1 text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to requests
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
  const isRecipient =
    !actor.isSystemAdmin && ticket.routingKind === 'PRIVATE_OWNER'
      ? await isTicketRecipient(db, { ticketId: ticket.id, userId: actor.userId })
      : false;
  const transitionMode = actor.isSystemAdmin
    ? 'none'
    : reporterTransitionMode(ticket.status, ticket.reporterId === actor.userId, isRecipient);
  return (
    <main
      data-testid="maintenance-detail-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6"
    >
      <Link
        data-testid="maintenance-detail-back"
        href="/maintenance"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to requests
      </Link>
      <TicketDetailSections
        ticket={ticket}
        roomLabel={roomLabel}
        testIdPrefix="maintenance-detail"
        transitionMode={transitionMode}
      />
    </main>
  );
}
