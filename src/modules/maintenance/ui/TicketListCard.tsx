'use client';

import Link from 'next/link';
import { Badge } from '@/shared/ui/Badge';
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
      className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <Link
          data-testid={`${testIdPrefix}-link-${ticket.id}`}
          href={detailHref}
          className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-foreground hover:underline"
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
        <span>Updated {formatInstant(ticket.updatedAt)}</span>
        {ticket.images.length > 0 ? (
          <span>
            {ticket.images.length} {ticket.images.length === 1 ? 'photo' : 'photos'}
          </span>
        ) : null}
        {ticket.comments.length > 0 ? (
          <span>
            {ticket.comments.length} {ticket.comments.length === 1 ? 'comment' : 'comments'}
          </span>
        ) : null}
      </div>
    </li>
  );
}
