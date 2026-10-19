import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { AppError } from '@/shared/utils/errors';
import { isUuid } from '@/shared/utils/idempotency';
import { EmptyState } from '@/shared/ui';
import { canActInRoom } from '@/modules/property-membership/application/index';
import {
  findBuildingById,
  findRoomById,
} from '@/modules/property-membership/infrastructure/structureRepository';
import { listMessages } from '@/modules/room-chat/application/index';
import { ChatConversation } from '@/modules/room-chat/ui/ChatConversation';
import { db } from '@/shared/db/client';

export const dynamic = 'force-dynamic';

export default async function RoomChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/rooms');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/rooms');
  const { roomId } = await params;
  if (!isUuid(roomId)) redirect('/rooms');
  const now = systemClock.now();
  if (!actor.isSystemAdmin) {
    const verdict = await canActInRoom(actor.userId, roomId, 'VIEW_ROOM', now).catch(() => null);
    const chatVerdict =
      verdict === null || !verdict.allowed
        ? null
        : await canActInRoom(actor.userId, roomId, 'VIEW_CHAT', now).catch(() => null);
    if (verdict === null || !verdict.allowed || chatVerdict === null || !chatVerdict.allowed) {
      return (
        <main data-testid="chat-page" className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <EmptyState
            data-testid="chat-denied"
            title="Chat not available"
            description="This chat does not exist or you do not have access to it."
            action={
              <Link
                data-testid="chat-back"
                href="/rooms"
                className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Back to My Rooms
              </Link>
            }
          />
        </main>
      );
    }
  }
  const room = await findRoomById(db, roomId);
  if (room === null) redirect('/rooms');
  const building = await findBuildingById(db, room.buildingId);
  const roomLabel = `${building?.code ?? 'Building'} · ${room.roomCode}`;
  let initialMessages: Awaited<ReturnType<typeof listMessages>>['messages'] = [];
  let initialCursor: string | null = null;
  try {
    const page = await listMessages(actor, { roomId, limit: 30 }, now, db);
    initialMessages = [...page.messages].sort((a, b) => {
      const time = a.createdAt.localeCompare(b.createdAt);
      if (time !== 0) return time;
      return a.id.localeCompare(b.id);
    });
    initialCursor = page.nextCursor;
  } catch (error) {
    if (error instanceof AppError && (error.code === 'RESOURCE_NOT_FOUND' || error.code === 'ACCESS_DENIED')) {
      return (
        <main data-testid="chat-page" className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <EmptyState
            data-testid="chat-denied"
            title="Chat not available"
            description="This chat does not exist or you do not have access to it."
            action={
              <Link
                data-testid="chat-back"
                href="/rooms"
                className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Back to My Rooms
              </Link>
            }
          />
        </main>
      );
    }
    throw error;
  }
  return (
    <main
      data-testid="chat-page"
      className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Link
          data-testid="chat-back"
          href={`/rooms/${roomId}`}
          className="inline-flex w-fit items-center gap-1 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back to room
        </Link>
        <div className="flex min-w-0 flex-col gap-1 border-b border-border pb-4">
          <h1 data-testid="chat-title" className="min-w-0 break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Room chat
          </h1>
          <p data-testid="chat-room-label" className="min-w-0 break-words text-sm text-muted-foreground">
            {roomLabel}
          </p>
        </div>
      </div>
      <ChatConversation
        roomId={roomId}
        roomLabel={roomLabel}
        actorUserId={actor.userId}
        initialMessages={initialMessages}
        initialCursor={initialCursor}
        backHref="/rooms"
        backLabel="Back to My Rooms"
        testIdPrefix="chat"
      />
    </main>
  );
}
