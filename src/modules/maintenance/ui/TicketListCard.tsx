'use client';

import Link from 'next/link';
import { Badge } from '@/shared/ui';
import type { TicketDto } from '@/modules/maintenance/application/index';
import {
  formatInstant,
  routingKindLabel,
  statusLabel,
  statusVariant,
} from '@/modules/maintenance/ui/ticketLabels';

export function TicketListCard({
  ticket,
  roomLabel,
  detailHref,
  testIdPrefix,
}: {
  ticket: TicketDto;
  roomLabel: string | null;
  detailHref: string;
  testIdPrefix: string;
}) {
  return (
    <li
      data-testid={`${testIdPrefix}-row-${ticket.id}`}
      className="border-b border-border px-1 py-4 transition-[background-color] duration-150 ease-out last:border-b-0 hover:bg-secondary motion-reduce:transition-none sm:px-2"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            data-testid={`${testIdPrefix}-link-${ticket.id}`}
            href={detailHref}
            className="min-w-0 flex-1 basis-48 break-words text-sm font-semibold text-foreground underline-offset-2 hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {ticket.subject}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge data-testid={`${testIdPrefix}-status-${ticket.id}`} variant={statusVariant(ticket.status)}>
              {statusLabel(ticket.status)}
            </Badge>
            <Badge data-testid={`${testIdPrefix}-kind-${ticket.id}`} variant="neutral">
              {routingKindLabel(ticket.routingKind)}
            </Badge>
          </div>
        </div>
        <p className="line-clamp-2 break-words text-sm text-muted-foreground">
          {ticket.locationDescription}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span data-testid={`${testIdPrefix}-room-${ticket.id}`}>
            {roomLabel ?? 'Common area'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Updated {formatInstant(ticket.updatedAt)}</span>
          {ticket.images.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {ticket.images.length} {ticket.images.length === 1 ? 'photo' : 'photos'}
              </span>
            </>
          ) : null}
          {ticket.comments.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {ticket.comments.length} {ticket.comments.length === 1 ? 'comment' : 'comments'}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
