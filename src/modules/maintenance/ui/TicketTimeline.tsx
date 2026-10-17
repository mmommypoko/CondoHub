'use client';

import { History } from 'lucide-react';
import type { TicketHistoryDto } from '@/modules/maintenance/application/index';
import {
  formatInstant,
  statusLabel,
} from '@/modules/maintenance/ui/ticketLabels';

export function TicketTimeline({
  history,
  testIdPrefix,
}: {
  history: TicketHistoryDto[];
  testIdPrefix: string;
}) {
  return (
    <section aria-label="Status history" className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <History aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Status history</h2>
      </div>
      {history.length === 0 ? (
        <p data-testid={`${testIdPrefix}-history-empty`} className="text-sm text-muted-foreground">
          No status changes yet.
        </p>
      ) : (
        <ol data-testid={`${testIdPrefix}-history`} className="flex min-w-0 flex-col gap-2">
          {history.map((entry) => (
            <li
              key={entry.id}
              data-testid={`${testIdPrefix}-history-${entry.id}`}
              className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-surface p-3 text-sm"
            >
              <p className="break-words font-medium text-foreground">
                {statusLabel(entry.fromState)} to {statusLabel(entry.toState)}
              </p>
              {entry.reason !== null && entry.reason !== '' ? (
                <p className="break-words text-foreground">{entry.reason}</p>
              ) : null}
              <p className="break-all text-xs text-muted-foreground">{formatInstant(entry.changedAt)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
