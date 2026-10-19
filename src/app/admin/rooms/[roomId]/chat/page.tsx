import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { isUuid } from '@/shared/utils/idempotency';
import { EmptyState } from '@/shared/ui';
import {
  findBuildingById,
  findRoomById,
} from '@/modules/property-membership/infrastructure/structureRepository';
import { listMessages } from '@/modules/room-chat/application/index';
import { ChatConversation } from '@/modules/room-chat/ui/ChatConversation';
import { db } from '@/shared/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminRoomChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/buildings');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { roomId } = await params;
  if (!isUuid(roomId)) redirect('/admin/buildings');
  const room = await findRoomById(db, roomId);
  if (room === null) {
    return (
      <main data-testid="admin-chat-page" className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <EmptyState
          data-testid="admin-chat-missing"
          title="Chat not available"
          description="This room does not exist."
          action={
            <Link
              data-testid="admin-chat-back"
              href="/admin/buildings"
              className="inline-flex items-center gap-1 text-body leading-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Back to buildings
            </Link>
          }
        />
      </main>
    );
  }
  const building = await findBuildingById(db, room.buildingId);
  const roomLabel = `${building?.code ?? 'Building'} · ${room.roomCode}`;
  const page = await listMessages(actor, { roomId, limit: 30 }, systemClock.now(), db);
  const initialMessages = [...page.messages].sort((a, b) => {
    const time = a.createdAt.localeCompare(b.createdAt);
    if (time !== 0) return time;
    return a.id.localeCompare(b.id);
  });
  return (
    <main
      data-testid="admin-chat-page"
      className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Link
          data-testid="admin-chat-back"
          href={`/admin/buildings/${building?.id ?? ''}`}
          className="inline-flex w-fit items-center gap-1 rounded-md text-body leading-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back to building
        </Link>
        <div className="flex min-w-0 flex-col gap-1 border-b border-border pb-4">
          <h1 data-testid="admin-chat-title" className="min-w-0 break-words text-title leading-title font-semibold tracking-tight text-foreground">
            Room chat
          </h1>
          <p data-testid="admin-chat-room-label" className="min-w-0 break-words text-small leading-small text-muted-foreground">
            {roomLabel}
          </p>
        </div>
      </div>
      <ChatConversation
        roomId={roomId}
        roomLabel={roomLabel}
        actorUserId={actor.userId}
        initialMessages={initialMessages}
        initialCursor={page.nextCursor}
        backHref="/admin/buildings"
        backLabel="Back to buildings"
        testIdPrefix="admin-chat"
      />
    </main>
  );
}
