import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

const emitSpy = vi.hoisted(() => ({ current: vi.fn() }));

vi.mock('../infrastructure/chatFanOut', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../infrastructure/chatFanOut')>();
  return { ...original, emitChatMessageCreated: emitSpy.current };
});

import type { SendMessageResult } from './sendMessage';
import { publishMessageCreatedIfInserted } from './publishMessageCreated';

function result(inserted: boolean): SendMessageResult {
  return {
    message: {
      id: 'message-1',
      conversationId: 'conv-1',
      roomId: 'room-1',
      senderUserId: 'user-1',
      senderName: 'Tenant A',
      senderIsAdmin: false,
      clientMessageId: 'key-1',
      type: 'TEXT',
      text: 'Replay-safe message.',
      imageId: null,
      createdAt: '2026-10-28T00:00:00.000Z',
    },
    inserted,
  };
}

describe('BUG-033 resend emits once', () => {
  it('emits when the send inserted a new row', () => {
    emitSpy.current.mockClear();
    const message = publishMessageCreatedIfInserted('room-1', result(true));
    expect(message.id).toBe('message-1');
    expect(emitSpy.current).toHaveBeenCalledTimes(1);
    expect(emitSpy.current).toHaveBeenCalledWith({
      roomId: 'room-1',
      messageId: 'message-1',
      createdAt: '2026-10-28T00:00:00.000Z',
    });
  });

  it('skips emit when the send replayed an existing row', () => {
    emitSpy.current.mockClear();
    const message = publishMessageCreatedIfInserted('room-1', result(false));
    expect(message.id).toBe('message-1');
    expect(emitSpy.current).not.toHaveBeenCalled();
  });
});
