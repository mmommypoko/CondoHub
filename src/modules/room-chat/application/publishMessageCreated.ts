import 'server-only';
import { emitChatMessageCreated } from '../infrastructure/chatFanOut';
import type { ChatMessageDto, SendMessageResult } from './sendMessage';

export function publishMessageCreatedIfInserted(
  roomId: string,
  result: SendMessageResult,
): ChatMessageDto {
  if (result.inserted) {
    emitChatMessageCreated({
      roomId,
      messageId: result.message.id,
      createdAt: result.message.createdAt,
    });
  }
  return result.message;
}
