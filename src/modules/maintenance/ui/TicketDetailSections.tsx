'use client';

import { useRouter } from 'next/navigation';
import type { TicketDto } from '@/modules/maintenance/application/index';
import { TicketDetailCard } from '@/modules/maintenance/ui/TicketDetailCard';
import { TicketTimeline } from '@/modules/maintenance/ui/TicketTimeline';
import { TicketComments } from '@/modules/maintenance/ui/TicketComments';
import { TicketCommentForm } from '@/modules/maintenance/ui/TicketCommentForm';
import {
  TicketTransitionForm,
  type TicketTransitionAction,
} from '@/modules/maintenance/ui/TicketTransitionForm';
import { isTerminalTicketStatus } from '@/modules/maintenance/ui/ticketLabels';

export function TicketDetailSections({
  ticket,
  roomLabel,
  testIdPrefix,
  transitionMode,
  showRoutingKind = true,
}: {
  ticket: TicketDto;
  roomLabel: string | null;
  testIdPrefix: string;
  transitionMode: TicketTransitionAction | 'none';
  showRoutingKind?: boolean;
}) {
  const router = useRouter();
  const refresh = (): void => router.refresh();
  const terminal = isTerminalTicketStatus(ticket.status);
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <TicketDetailCard ticket={ticket} roomLabel={roomLabel} testIdPrefix={testIdPrefix} showRoutingKind={showRoutingKind} />
      {!terminal ? (
        <section aria-label="Status update" className="flex min-w-0 flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-heading leading-heading font-semibold text-foreground">Status update</h2>
          {transitionMode === 'none' ? (
            <p data-testid={`${testIdPrefix}-transition-unavailable`} className="text-small leading-small text-muted-foreground">
              Status changes are handled by the room owners or the management team.
            </p>
          ) : (
            <TicketTransitionForm
              ticketId={ticket.id}
              currentStatus={ticket.status}
              expectedVersion={ticket.version}
              mode={transitionMode}
              testIdPrefix={testIdPrefix}
              onTransitioned={refresh}
            />
          )}
        </section>
      ) : null}
      {!terminal ? (
        <section aria-label="Add a comment" className="flex min-w-0 flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-heading leading-heading font-semibold text-foreground">Add a comment</h2>
          <TicketCommentForm ticketId={ticket.id} testIdPrefix={testIdPrefix} onCommented={refresh} />
        </section>
      ) : null}
      <div className="border-t border-border pt-6">
        <TicketComments comments={ticket.comments} testIdPrefix={testIdPrefix} />
      </div>
      <div className="border-t border-border pt-6">
        <TicketTimeline history={ticket.history} testIdPrefix={testIdPrefix} />
      </div>
    </div>
  );
}
