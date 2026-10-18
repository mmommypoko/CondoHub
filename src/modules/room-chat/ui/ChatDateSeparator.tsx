'use client';

import { formatChatDay } from '@/modules/room-chat/ui/chatLabels';

export function ChatDateSeparator({ value, testId }: { value: string; testId: string }) {
  return (
    <div data-testid={testId} className="flex items-center gap-3 py-1" role="separator">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="shrink-0 rounded-full border border-border bg-surface px-3 py-0.5 text-xs font-medium text-muted-foreground">
        {formatChatDay(value)}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}
