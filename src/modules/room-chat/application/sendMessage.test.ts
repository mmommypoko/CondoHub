import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { AppError } from '@/shared/utils/errors';
import type { ChatCtx } from './ctx';
import type { MessageRecord } from '../infrastructure/chatRepository';
import { fakeActor, fakeClock } from '@/tests/fakes';

const { findMessageByClientKeyMock, insertMessageIdempotentMock, insertConversationForRoomMock } =
  vi.hoisted(() => ({
    findMessageByClientKeyMock: vi.fn(),
    insertMessageIdempotentMock: vi.fn(),
    insertConversationForRoomMock: vi.fn(),
  }));

vi.mock('../infrastructure/chatRepository', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../infrastructure/chatRepository')>();
  return {
    ...original,
    findMessageByClientKey: findMessageByClientKeyMock,
    insertConversationForRoom: insertConversationForRoomMock,
    insertMessageIdempotent: insertMessageIdempotentMock,
  };
});

vi.mock('@/modules/property-membership/application/index', () => ({
  canActInRoom: vi.fn(async () => ({ allowed: true })),
  getResidentIntervals: vi.fn(async () => []),
}));

vi.mock('@/modules/identity-access/application/index', () => ({
  getSenderProfile: vi.fn(async () => ({ userId: 'user-1', name: 'Tenant A', isSystemAdmin: false })),
}));

vi.mock('@/modules/media-attachments/application/index', () => ({
  commitAttachments: vi.fn(async () => undefined),
}));

vi.mock('@/shared/observability/audit', () => ({
  writeAudit: vi.fn(async () => undefined),
}));

vi.mock('@/shared/db/client', () => ({
  db: { transaction: (fn: (tx: object) => Promise<unknown>) => fn({}) },
  closeDb: vi.fn(),
}));

import { sendMessage } from './sendMessage';

function chatCtx(): ChatCtx {
  return { clock: fakeClock('2026-10-28T00:00:00.000Z'), requestId: 'req-1', isSeedActor: false };
}

function messageRecord(): MessageRecord {
  return {
    id: 'message-1',
    conversationId: 'conv-1',
    senderUserId: 'user-1',
    clientMessageId: 'key-1',
    senderSnapshot: { name: 'Tenant A', isAdmin: false },
    type: 'TEXT',
    text: 'Replay-safe message.',
    imageId: null,
    createdAt: new Date('2026-10-28T00:00:00.000Z'),
  };
}

describe('BUG-033 BUG-034 replay semantics', () => {
  it('returns inserted false when the idempotent insert hits an existing row', async () => {
    const record = messageRecord();
    insertConversationForRoomMock.mockResolvedValue({
      id: 'conv-1',
      roomId: 'room-1',
      createdAt: new Date(),
    });
    insertMessageIdempotentMock.mockResolvedValue({ record, inserted: false });
    findMessageByClientKeyMock.mockResolvedValue(record);

    const actor = fakeActor({ userId: 'user-1', isSystemAdmin: true });
    const result = await sendMessage(
      actor,
      { roomId: 'room-1', clientMessageId: 'key-1', text: 'Replay-safe message.' },
      chatCtx(),
    );

    expect(result.inserted).toBe(false);
    expect(result.message.id).toBe('message-1');
  });

  it('throws VALIDATION_ERROR when replay finds no row for the client key', async () => {
    insertConversationForRoomMock.mockResolvedValue({
      id: 'conv-1',
      roomId: 'room-1',
      createdAt: new Date(),
    });
    insertMessageIdempotentMock.mockResolvedValue({ record: messageRecord(), inserted: false });
    findMessageByClientKeyMock.mockResolvedValue(null);

    const actor = fakeActor({ userId: 'user-1', isSystemAdmin: true });
    try {
      await sendMessage(
        actor,
        { roomId: 'room-1', clientMessageId: 'key-1', text: 'Replay-safe message.' },
        chatCtx(),
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('VALIDATION_ERROR');
    }
  });
});
