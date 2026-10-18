'use client';

import { Badge } from '@/shared/ui/Badge';
import { ChatDateSeparator } from '@/modules/room-chat/ui/ChatDateSeparator';
import { ChatImageBubble } from '@/modules/room-chat/ui/ChatImageBubble';
import { formatChatExact, formatChatTime } from '@/modules/room-chat/ui/chatLabels';
import type { ChatMessageDto } from '@/modules/room-chat/ui/chatTypes';

export function ChatMessageBubble({
  message,
  own,
  testIdPrefix,
  separator,
}: {
  message: ChatMessageDto;
  own: boolean;
  testIdPrefix: string;
  separator: { value: string; day: string } | null;
}) {
  const testId = `${testIdPrefix}-message-${message.id}`;
  return (
    <li
      data-testid={testId}
      data-message-id={message.id}
      data-created-at={message.createdAt}
      className={`flex min-w-0 flex-col gap-3 ${own ? 'items-end' : 'items-start'}`}
    >
      {separator !== null ? (
        <div className="w-full min-w-0" data-chat-separator="true">
          <ChatDateSeparator value={separator.value} testId={`${testIdPrefix}-day-${separator.day}`} />
        </div>
      ) : null}
      <div className={`flex min-w-0 max-w-full flex-wrap items-center gap-2 ${own ? 'justify-end' : 'justify-start'}`}>
        <span data-testid={`${testId}-sender`} className="min-w-0 break-words text-xs font-semibold text-foreground">
          {message.senderName}
        </span>
        {message.senderIsAdmin ? (
          <Badge data-testid={`${testId}-admin`} variant="info">
            Admin
            <span className="sr-only">message from a system admin</span>
          </Badge>
        ) : null}
        <time
          data-testid={`${testId}-time`}
          dateTime={message.createdAt}
          title={formatChatExact(message.createdAt)}
          className="shrink-0 text-xs text-muted-foreground"
        >
          {formatChatTime(message.createdAt)}
        </time>
      </div>
      <div
        className={`flex min-w-0 max-w-full flex-col gap-2 rounded-xl border border-border bg-surface p-3 ${
          own ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
      >
        {message.text !== null && message.text !== '' ? (
          <p data-testid={`${testId}-text`} className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
            {message.text}
          </p>
        ) : null}
        {message.imageId !== null ? (
          <ChatImageBubble imageId={message.imageId} alt="Chat image attachment" testId={`${testId}-image`} />
        ) : null}
      </div>
    </li>
  );
}
