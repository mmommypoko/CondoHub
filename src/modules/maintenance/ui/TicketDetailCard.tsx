'use client';

import { Badge } from '@/shared/ui';
import type { TicketDto } from '@/modules/maintenance/application/index';
import { TicketImage } from '@/modules/maintenance/ui/TicketImage';
import {
  formatInstant,
  isTerminalTicketStatus,
  routingKindLabel,
  statusLabel,
  statusVariant,
} from '@/modules/maintenance/ui/ticketLabels';

export function TicketDetailCard({
  ticket,
  roomLabel,
  testIdPrefix,
}: {
  ticket: TicketDto;
  roomLabel: string | null;
  testIdPrefix: string;
}) {
  const terminal = isTerminalTicketStatus(ticket.status);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="break-all text-xs leading-6 text-muted-foreground">
            <span data-testid={`${testIdPrefix}-id`}>{ticket.id}</span>
          </p>
          <h1
            data-testid={`${testIdPrefix}-title`}
            className="break-words text-xl font-semibold tracking-tight text-foreground"
          >
            {ticket.subject}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge data-testid={`${testIdPrefix}-status`} variant={statusVariant(ticket.status)}>
            {statusLabel(ticket.status)}
          </Badge>
          <Badge data-testid={`${testIdPrefix}-kind`} variant="info">
            {routingKindLabel(ticket.routingKind)}
          </Badge>
        </div>
      </div>
      {terminal ? (
        <p
          data-testid={`${testIdPrefix}-terminal-note`}
          role="status"
          className="rounded-xl border border-border bg-neutral p-3 text-sm leading-6 text-neutral-foreground"
        >
          This request is {statusLabel(ticket.status).toLowerCase()} and read-only. Comments and
          status changes are closed.
        </p>
      ) : null}
      <dl
        data-testid={`${testIdPrefix}-facts`}
        className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2 sm:p-5"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">
            Location
          </dt>
          <dd data-testid={`${testIdPrefix}-location`} className="break-words leading-6 text-foreground">
            {ticket.locationDescription}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">
            Room
          </dt>
          <dd data-testid={`${testIdPrefix}-room`} className="break-words leading-6 text-foreground">
            {roomLabel ?? 'Common area, no room'}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">
            Details
          </dt>
          <dd data-testid={`${testIdPrefix}-description`} className="whitespace-pre-wrap break-words leading-6 text-foreground">
            {ticket.description}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">
            Reported
          </dt>
          <dd data-testid={`${testIdPrefix}-created`} className="break-words leading-6 text-foreground">
            {formatInstant(ticket.createdAt)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">
            Last update
          </dt>
          <dd data-testid={`${testIdPrefix}-updated`} className="break-words leading-6 text-foreground">
            {formatInstant(ticket.updatedAt)}
          </dd>
        </div>
      </dl>
      <section aria-label="Report photos" className="flex min-w-0 flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Report photos ({ticket.images.length})
        </h2>
        {ticket.images.length === 0 ? (
          <p data-testid={`${testIdPrefix}-images-empty`} className="text-sm leading-6 text-muted-foreground">
            No photos were attached to this report.
          </p>
        ) : (
          <ul data-testid={`${testIdPrefix}-images`} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {ticket.images.map((image, index) => (
              <li key={image.id} className="min-w-0">
                <TicketImage
                  imageId={image.id}
                  alt={`Report photo ${index + 1}`}
                  testId={`${testIdPrefix}-image-${image.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
